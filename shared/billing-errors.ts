/** Shown to platform owners when billing/payment APIs fail unexpectedly. */
export const BILLING_PAYMENT_UNAVAILABLE_MESSAGE =
  "We're unable to take payment right now. Please try again later.";

/** User-actionable billing messages — keep visible (not replaced with generic copy). */
const BILLING_PAYMENT_ACTIONABLE_PATTERNS: RegExp[] = [
  /no payment method on file/i,
  /complete subscription payment/i,
  /complete a payment first/i,
  /must have an email address/i,
  /card authentication required/i,
  /invalid (dimension|tier|pack)/i,
  /subscribe or complete/i,
];

export function isBillingPaymentActionableMessage(
  message: string | null | undefined,
): boolean {
  const raw = (message ?? "").trim();
  if (!raw) return false;
  if (raw === BILLING_PAYMENT_UNAVAILABLE_MESSAGE) return true;
  return BILLING_PAYMENT_ACTIONABLE_PATTERNS.some((re) => re.test(raw));
}
