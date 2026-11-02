import crypto from "crypto";

/** Max participants for Twilio Group MMS (US/CA). */
export const GROUP_MMS_MAX_PARTICIPANTS = 10;

export type GroupParticipantType =
  | "client"
  | "broker"
  | "lead"
  | "external_phone";

export interface GroupParticipantPreview {
  name: string;
  type: GroupParticipantType | string;
}

export interface GroupTitleParticipant {
  display_name: string;
}

/** Normalize phone to E.164-ish (+digits). */
export function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return phone.trim();
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? `+${digits}` : `+${digits}`;
}

/** Last 10 digits for matching. */
export function phoneLast10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** Stable fingerprint for group thread identity. */
export function computeParticipantFingerprint(
  inboxNumber: string | null,
  phones: string[],
): string {
  const normalized = [
    ...new Set(
      phones
        .map((p) => normalizeE164(p))
        .filter((p) => p.replace(/\D/g, "").length >= 10),
    ),
  ].sort();
  const inbox = inboxNumber ? normalizeE164(inboxNumber) : "";
  const payload = `${inbox}|${normalized.join(",")}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/** Auto-generated group title when user title is absent. */
export function buildAutoGroupTitle(
  participants: GroupTitleParticipant[],
): string {
  const names = participants
    .map((p) => p.display_name?.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  if (names.length === 0) return "Group conversation";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  const extra = names.length - 2;
  const base = `${names[0]}, ${names[1]}`;
  const suffix = extra > 0 ? ` +${extra}` : "";
  const full = `${base}${suffix}`;
  return full.length > 255 ? `${full.slice(0, 252)}...` : full;
}

/** Parse Twilio OtherRecipients0..N from webhook body. */
export function parseOtherRecipients(
  body: Record<string, unknown> | null | undefined,
): string[] {
  if (!body) return [];
  const out: string[] = [];
  for (let i = 0; i < GROUP_MMS_MAX_PARTICIPANTS; i++) {
    const key = `OtherRecipients${i}`;
    const val = body[key];
    if (typeof val === "string" && val.trim()) {
      out.push(normalizeE164(val.trim()));
    }
  }
  if (Array.isArray(body.recipients)) {
    for (const r of body.recipients) {
      if (typeof r === "string" && r.trim()) {
        out.push(normalizeE164(r.trim()));
      }
    }
  }
  return [...new Set(out)];
}

export function formatPhoneLabel(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) {
    const a = d.slice(1, 4);
    const b = d.slice(4, 7);
    const c = d.slice(7);
    return `(${a}) ${b}-${c}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return phone;
}

export function resolveDisplayTitle(
  title: string | null | undefined,
  participants: GroupTitleParticipant[],
): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  return buildAutoGroupTitle(participants);
}

export function isGroupConversationsEnabled(
  envValue: string | undefined,
): boolean {
  const v = (envValue ?? "").toLowerCase().trim();
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return true;
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  const v = (value ?? "").toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Resolve whether group conversations are active for this runtime. */
export function resolveGroupConversationsEnabled(
  env: {
    enabled?: string;
    allowProduction?: string;
    runtime?: string;
  } = {},
): boolean {
  // Prefer explicit override keys (even when undefined) so tests are not
  // polluted by process.env — `??` alone still reads env when value is undefined.
  const enabledRaw =
    "enabled" in env ? env.enabled : process.env.GROUP_CONVERSATIONS_ENABLED;
  if (!isGroupConversationsEnabled(enabledRaw)) {
    return false;
  }

  const runtime = (
    ("runtime" in env
      ? env.runtime
      : process.env.VERCEL_ENV ?? process.env.NODE_ENV) ?? ""
  ).toLowerCase();

  if (runtime !== "production") return true;

  const allowRaw =
    "allowProduction" in env
      ? env.allowProduction
      : process.env.GROUP_CONVERSATIONS_ALLOW_PRODUCTION;
  return isTruthyEnvFlag(allowRaw);
}

export function newGroupConversationId(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `conv_group_${uuid}`;
}

/** UCS-2-aware segment count (matches api billing + shared/short-links). */
export function smsSegmentsFromBody(body: string): number {
  const text = String(body ?? "");
  const hasNonGsm = /[^\x00-\x7F]/.test(text);
  const perSeg = hasNonGsm ? 67 : 160;
  const charCount = text.length;
  return charCount === 0 ? 1 : Math.ceil(charCount / perSeg);
}

/** Group MMS bills segments × active recipients. */
export function groupSmsQuotaUnits(
  body: string,
  recipientCount: number,
): number {
  return smsSegmentsFromBody(body) * Math.max(recipientCount, 1);
}
