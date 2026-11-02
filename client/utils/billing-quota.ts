import type { UnifiedQuotaSummary } from "@shared/api";
import {
  broadcastSmsQuotaUnits,
  estimateBroadcastUnits as estimateBroadcastUnitsShared,
  smsSegmentsFromBody as smsSegmentsFromBodyShared,
} from "@shared/short-links";

export function smsSegmentsFromBody(body: string): number {
  return smsSegmentsFromBodyShared(body);
}

export function estimateBroadcastUnits(params: {
  channel: string;
  smsBody?: string;
  emailRecipientCount: number;
  smsRecipientCount: number;
  hasMedia?: boolean;
}): { sms_segments: number; email_sends: number } {
  return estimateBroadcastUnitsShared(params);
}

/** @deprecated Prefer estimateBroadcastUnits({ hasMedia }) */
export function broadcastSmsUnits(
  body: string,
  hasMedia = false,
): number {
  return broadcastSmsQuotaUnits(body, hasMedia);
}

export function quotaSliceRemaining(slice: {
  used: number;
  included: number;
  reserved: number;
}): number {
  return Math.max(0, slice.included - slice.used - slice.reserved);
}

export function wouldExceedQuota(
  quota: UnifiedQuotaSummary | null | undefined,
  estimate: { sms_segments: number; email_sends: number },
): boolean {
  if (!quota || quota.mode === "off" || quota.mode === "shadow") return false;
  const smsProjected =
    quota.sms_segments.used +
    quota.sms_segments.reserved +
    estimate.sms_segments;
  const emailProjected =
    quota.email_sends.used +
    quota.email_sends.reserved +
    estimate.email_sends;
  const smsOver =
    quota.sms_segments.included > 0 &&
    smsProjected > quota.sms_segments.included;
  const emailOver =
    quota.email_sends.included > 0 &&
    emailProjected > quota.email_sends.included;
  return quota.mode === "enforce" && (smsOver || emailOver);
}

export const INSUFFICIENT_QUOTA_MESSAGE =
  "Monthly quota exceeded — add capacity in Billing to resume sends.";

/** Progress % for usage bars — uses live quota capacity (plan + top-ups), not plan-only. */
export function usagePctAgainstCapacity(used: number, included: number): number {
  if (included <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / included) * 100));
}

export function resolveQuotaIncluded(
  quota: UnifiedQuotaSummary | null | undefined,
  slice: keyof Pick<
    UnifiedQuotaSummary,
    | "sms_segments"
    | "voice_minutes"
    | "email_sends"
    | "scheduler_bookings"
    | "mortgi_ai_tokens"
  >,
  planFallback: number,
): number {
  const row = quota?.[slice];
  if (row && typeof row === "object" && "included" in row && row.included > 0) {
    return row.included;
  }
  return planFallback;
}
