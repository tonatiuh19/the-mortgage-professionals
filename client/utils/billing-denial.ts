import axios from "axios";
import type { BillingDenialPayload } from "@shared/billing-denial";

export type { BillingDenialPayload };

export function parseBillingDenial(error: unknown): BillingDenialPayload | null {
  if (!axios.isAxiosError(error)) return null;
  const data = error.response?.data as BillingDenialPayload | undefined;
  if (!data) return null;
  if (
    !data.billing_action_required &&
    !data.quota_exceeded &&
    !data.billing_access_level
  ) {
    return null;
  }
  return data;
}

export function billingDenialMessage(
  denial: BillingDenialPayload | null,
  fallback: string,
): string {
  if (!denial) return fallback;
  return denial.message || denial.error || fallback;
}

export function billingDenialHeadline(
  denial: BillingDenialPayload | null,
  fallback: string,
): string {
  if (!denial) return fallback;
  return denial.error || fallback;
}
