import type { BillingConfigPayload } from "@shared/api";

/**
 * Internal COGS/margin UI — never in production builds.
 * Belt-and-suspenders: even if API mis-flags, prod bundle hides internal panels.
 */
export function showBillingInternalEconomics(
  config: Pick<BillingConfigPayload, "billingInternalEconomicsEnabled"> | null | undefined,
): boolean {
  if (import.meta.env.PROD) return false;
  return Boolean(config?.billingInternalEconomicsEnabled);
}
