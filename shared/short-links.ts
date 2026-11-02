/**
 * Broadcast SMS short links, segment warnings, and MMS caps.
 * Source of truth for client + smoke tests — runtime copy inlined in api/index.ts.
 */

export const BROADCAST_MMS_MAX_RECIPIENTS = 50;
export const SMS_SEGMENT_SOFT_WARN = 3;
export const SMS_SEGMENT_HARD_WARN = 5;

/** MMS draws from sms_segments pool; ~$0.022 / $0.012 ≈ 2 segment-equivalents min. */
export const BROADCAST_MMS_QUOTA_MIN_SEGMENTS = 2;

/** Orphan durable assets older than this may be purged by cron. */
export const LINK_ASSET_RETENTION_DAYS = 90;

export const DEFAULT_PORTAL_SHORT_LINK_ORIGIN =
  "https://www.themortgagepro.net";

/** First-party host suffixes allowed as short-link targets (phishing guard). */
export const SHORT_LINK_ALLOWED_HOST_SUFFIXES = [
  "themortgagepro.net",
] as const;

export const BROADCAST_LINK_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export type BroadcastLinkMime =
  (typeof BROADCAST_LINK_ALLOWED_MIMES)[number];

/** GSM-7 vs UCS-2 segment estimate (Twilio-style). */
export function estimateSmsSegments(text: string): {
  segments: number;
  encoding: "GSM-7" | "UCS-2";
  charCount: number;
  hasNonGsm: boolean;
} {
  const body = String(text ?? "");
  const charCount = body.length;
  // Rough UCS-2 trigger: non-GSM printable / emoji / smart punctuation
  const hasNonGsm = /[^\x00-\x7F]/.test(body);
  const encoding = hasNonGsm ? "UCS-2" : "GSM-7";
  const perSeg = hasNonGsm ? 67 : 160;
  const segments = charCount === 0 ? 1 : Math.ceil(charCount / perSeg);
  return { segments, encoding, charCount, hasNonGsm };
}

/** Canonical segment count for quota (UCS-2-aware). */
export function smsSegmentsFromBody(body: string): number {
  return estimateSmsSegments(body).segments;
}

/**
 * Per-recipient SMS quota units for broadcasts / wire sends.
 * With media, reserve at least BROADCAST_MMS_QUOTA_MIN_SEGMENTS.
 */
export function broadcastSmsQuotaUnits(
  body: string,
  hasMedia = false,
): number {
  const base = smsSegmentsFromBody(body);
  if (!hasMedia) return base;
  return Math.max(base, BROADCAST_MMS_QUOTA_MIN_SEGMENTS);
}

export function estimateBroadcastUnits(params: {
  channel: string;
  smsBody?: string;
  emailRecipientCount: number;
  smsRecipientCount: number;
  hasMedia?: boolean;
}): { sms_segments: number; email_sends: number } {
  const segmentsPerSms = broadcastSmsQuotaUnits(
    params.smsBody || "",
    !!params.hasMedia,
  );
  const sms_segments =
    params.channel === "sms" || params.channel === "both"
      ? params.smsRecipientCount * segmentsPerSms
      : 0;
  const email_sends =
    params.channel === "email" || params.channel === "both"
      ? params.emailRecipientCount
      : 0;
  return { sms_segments, email_sends };
}

export function smsSegmentWarningLevel(
  segments: number,
): "ok" | "soft" | "hard" {
  if (segments >= SMS_SEGMENT_HARD_WARN) return "hard";
  if (segments >= SMS_SEGMENT_SOFT_WARN) return "soft";
  return "ok";
}

export function generateShortLinkCode(length = 8): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint8Array(length))
      : Uint8Array.from({ length }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export function buildPortalShortLinkUrl(
  code: string,
  origin: string = DEFAULT_PORTAL_SHORT_LINK_ORIGIN,
): string {
  const base = String(origin || DEFAULT_PORTAL_SHORT_LINK_ORIGIN).replace(
    /\/$/,
    "",
  );
  const safe = String(code || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return `${base}/l/${safe}`;
}

export function isAllowedBroadcastLinkMime(mime: string): boolean {
  return (BROADCAST_LINK_ALLOWED_MIMES as readonly string[]).includes(mime);
}

function hostMatchesAllowedSuffix(host: string, suffix: string): boolean {
  const h = host.toLowerCase();
  const s = suffix.toLowerCase();
  return h === s || h.endsWith(`.${s}`);
}

/**
 * Short-link targets must stay on first-party (or explicitly allowed) hosts
 * so www.themortgagepro.net/l/… cannot launder phishing destinations.
 */
export function isAllowedShortLinkTargetUrl(
  targetUrl: string,
  extraAllowedHosts: string[] = [],
): { ok: boolean; error?: string } {
  const raw = String(targetUrl || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return {
      ok: false,
      error: "target_url must be an absolute http(s) URL",
    };
  }
  if (raw.length > 2048) {
    return { ok: false, error: "target_url is too long" };
  }
  let hostname = "";
  try {
    hostname = new URL(raw).hostname.toLowerCase();
  } catch {
    return { ok: false, error: "target_url is not a valid URL" };
  }
  if (!hostname) {
    return { ok: false, error: "target_url is not a valid URL" };
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { ok: true };
  }
  for (const suffix of SHORT_LINK_ALLOWED_HOST_SUFFIXES) {
    if (hostMatchesAllowedSuffix(hostname, suffix)) return { ok: true };
  }
  for (const extra of extraAllowedHosts) {
    const e = String(extra || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      ?.split(":")[0];
    if (e && (hostname === e || hostMatchesAllowedSuffix(hostname, e))) {
      return { ok: true };
    }
  }
  return {
    ok: false,
    error:
      "Short links may only target The Mortgage Professionals domains (or your portal / MMS public host).",
  };
}

/** MMS cannot use Twilio Bulk Messaging — force Messages API path. */
export function shouldSkipBulkForBroadcastMedia(
  mediaUrl: string | null | undefined,
): boolean {
  return typeof mediaUrl === "string" && mediaUrl.trim().length > 0;
}

export function buildEmailCtaButtonHtml(params: {
  url: string;
  label?: string;
}): string {
  const url = String(params.url || "").trim();
  const label = (params.label || "View details").replace(/[<>]/g, "");
  if (!url) return "";
  return `<p style="margin:24px 0;text-align:center;"><a href="${url.replace(/"/g, "")}" style="display:inline-block;background-color:#e8192c;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">${label}</a></p>`;
}

/** Short invite template — append short URL after create. */
export function buildShortSmsInviteTemplate(params: {
  firstNameTag?: string;
  brokerNameTag?: string;
  shortUrl?: string;
}): string {
  const first = params.firstNameTag || "{{first_name}}";
  const broker = params.brokerNameTag || "{{broker_name}}";
  const link = (params.shortUrl || "").trim();
  const linkPart = link ? ` Details: ${link}` : " Details: ";
  return `Hi ${first}, The Mortgage Professionals update from ${broker}.${linkPart}`;
}

export function assertBroadcastMmsAudienceOk(smsRecipientCount: number): {
  ok: boolean;
  error?: string;
} {
  const n = Math.max(0, Math.floor(Number(smsRecipientCount) || 0));
  if (n > BROADCAST_MMS_MAX_RECIPIENTS) {
    return {
      ok: false,
      error: `MMS broadcast is limited to ${BROADCAST_MMS_MAX_RECIPIENTS} SMS recipients. Use a short link for larger audiences, or shrink the list.`,
    };
  }
  return { ok: true };
}
