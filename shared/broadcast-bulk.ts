/**
 * Twilio Bulk Messaging helpers for Realtor Broadcasts.
 * Pure functions for client, tests, and smoke scripts.
 * Runtime copies / imports must stay compatible with api/index.ts.
 */

export type BroadcastSmsEngineMode = "messages" | "bulk";

export const BROADCAST_BULK_DEFAULT_CHUNK_SIZE = 9000;
export const BROADCAST_BULK_MAX_RECIPIENTS_PER_REQUEST = 10000;

export interface BulkOperationStats {
  total?: number;
  recipients?: number;
  attempts?: number;
  unaddressable?: number;
  queued?: number;
  sent?: number;
  scheduled?: number;
  delivered?: number;
  read?: number;
  undelivered?: number;
  failed?: number;
  canceled?: number;
}

export interface BroadcastBulkProgress {
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  progressPct: number;
  operationStatus: string | null;
}

/** Normalize dialable phone to digits-only E.164-ish form for matching. */
export function normalizeBroadcastPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeBroadcastPhone(a);
  const nb = normalizeBroadcastPhone(b);
  return Boolean(na && nb && na === nb);
}

export function chunkArray<T>(
  items: T[],
  chunkSize: number = BROADCAST_BULK_DEFAULT_CHUNK_SIZE,
): T[][] {
  const size = Math.max(
    1,
    Math.min(chunkSize, BROADCAST_BULK_MAX_RECIPIENTS_PER_REQUEST),
  );
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function parseBroadcastSmsEngine(
  value: string | null | undefined,
): BroadcastSmsEngineMode {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "bulk"
    ? "bulk"
    : "messages";
}

/**
 * Internal ops gate — not exposed in Settings UI.
 * Off unless BROADCAST_BULK_MESSAGING_ENABLED is truthy (1/true/yes/on)
 * or BROADCAST_SMS_ENGINE=bulk.
 */
export function resolveBroadcastSmsEngineFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): BroadcastSmsEngineMode {
  const explicit = String(env.BROADCAST_SMS_ENGINE ?? "")
    .trim()
    .toLowerCase();
  if (explicit === "bulk" || explicit === "messages") {
    return explicit;
  }
  const enabled = String(env.BROADCAST_BULK_MESSAGING_ENABLED ?? "")
    .trim()
    .toLowerCase();
  if (enabled === "1" || enabled === "true" || enabled === "yes" || enabled === "on") {
    return "bulk";
  }
  return "messages";
}

/** Whether Bulk engine should run for this campaign (SMS channel + flag + optional min size). */
export function shouldUseBulkSmsEngine(params: {
  engineSetting: string | null | undefined;
  channel: string;
  smsRecipientCount: number;
  minRecipients?: number;
}): boolean {
  if (parseBroadcastSmsEngine(params.engineSetting) !== "bulk") return false;
  if (params.channel !== "sms" && params.channel !== "both") return false;
  const min = Math.max(1, Number(params.minRecipients ?? 1));
  return params.smsRecipientCount >= min;
}

export function mapBulkOperationStatsToProgress(
  stats: BulkOperationStats | null | undefined,
  recipientCount: number,
  operationStatus?: string | null,
): BroadcastBulkProgress {
  const sent =
    Number(stats?.sent ?? 0) +
    Number(stats?.delivered ?? 0) +
    Number(stats?.read ?? 0);
  const failed =
    Number(stats?.failed ?? 0) +
    Number(stats?.undelivered ?? 0) +
    Number(stats?.unaddressable ?? 0) +
    Number(stats?.canceled ?? 0);
  const total = Math.max(recipientCount, Number(stats?.recipients ?? 0), sent + failed);
  const pendingCount = Math.max(0, total - sent - failed);
  const progressPct =
    total > 0 ? Math.min(100, Math.round(((sent + failed) / total) * 100)) : 0;
  return {
    sentCount: sent,
    failedCount: failed,
    pendingCount,
    progressPct,
    operationStatus: operationStatus ?? null,
  };
}

export function isBulkOperationTerminal(status: string | null | undefined): boolean {
  const s = String(status ?? "").toUpperCase();
  return s === "COMPLETED" || s === "FAILED" || s === "CANCELED" || s === "CANCELLED";
}

export function parseOperationIdsJson(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x)).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((x) => String(x)).filter(Boolean)
        : [];
    } catch {
      return raw.trim() ? [raw.trim()] : [];
    }
  }
  return [];
}

export function broadcastBulkBillingLabel(engine: BroadcastSmsEngineMode | string | null): string {
  return parseBroadcastSmsEngine(engine) === "bulk"
    ? "Broadcast (Bulk)"
    : "Broadcast";
}
