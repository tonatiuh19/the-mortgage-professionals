/**
 * Billing period anchor helpers — Stripe subscription cycle vs calendar month.
 * Source of truth for client UI and tests; mirrored inline in api/index.ts for Vercel.
 */

export type BillingPeriodAnchor = "stripe" | "calendar";

const STRIPE_ANCHOR_BLOCKED_STATUSES = new Set([
  "inactive",
  "canceled",
  "incomplete_expired",
]);

/** Normalize mysql2 DATE (Date object or string) to `YYYY-MM-DD`. */
export function toSqlDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

/** First day of the current UTC calendar month (`YYYY-MM-01`). */
export function currentCalendarMonthStart(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Last day of the UTC calendar month containing `monthStart` (`YYYY-MM-01`). */
export function calendarMonthEnd(monthStart: string): string {
  const match = /^(\d{4})-(\d{2})-01$/.exec(monthStart);
  if (!match) return monthStart;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`;
}

/** Stripe unix seconds → UTC `YYYY-MM-DD` (matches api/index.ts stripePeriodToSqlDate). */
export function stripePeriodToSqlDate(unixSeconds: unknown): string | null {
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function stripeSubscriptionPeriodFromObject(
  subscription: Record<string, unknown>,
): { periodStart: string | null; periodEnd: string | null } {
  return {
    periodStart: stripePeriodToSqlDate(subscription.current_period_start),
    periodEnd: stripePeriodToSqlDate(subscription.current_period_end),
  };
}

/**
 * Tenants with a linked Stripe subscription use the Stripe billing anchor.
 * Calendar-month advance is only for manual / pre-Stripe onboarding tenants.
 */
export function resolveBillingPeriodAnchor(params: {
  stripeSubscriptionId: string | null | undefined;
  subscriptionStatus: string | null | undefined;
}): BillingPeriodAnchor {
  const subId = String(params.stripeSubscriptionId ?? "").trim();
  if (!subId) return "calendar";
  const status = String(params.subscriptionStatus ?? "inactive")
    .trim()
    .toLowerCase();
  if (STRIPE_ANCHOR_BLOCKED_STATUSES.has(status)) return "calendar";
  return "stripe";
}

/** Whether legacy calendar rollover should mutate tenant_subscription.period_start. */
export function shouldAdvanceCalendarBillingPeriod(params: {
  anchor: BillingPeriodAnchor;
  storedPeriodStart: string | null;
  calendarMonthStart: string;
}): boolean {
  if (params.anchor === "stripe") return false;
  const stored = params.storedPeriodStart ?? params.calendarMonthStart;
  return params.calendarMonthStart > stored;
}

export function resolveActivePeriodStart(params: {
  subscriptionPeriodStart: string | null;
  anchor: BillingPeriodAnchor;
  calendarMonthStart: string;
}): string {
  if (params.subscriptionPeriodStart) return params.subscriptionPeriodStart;
  return params.calendarMonthStart;
}

export function isBillingPeriodTransition(
  previousStart: string | null | undefined,
  nextStart: string | null | undefined,
): boolean {
  if (!nextStart) return false;
  if (!previousStart) return true;
  return previousStart !== nextStart;
}

/** Whether loading billing config should re-sync period fields from Stripe. */
export function shouldSyncStripeSubscriptionPeriod(params: {
  dbPeriodStart: string | null;
  dbStatus: string | null;
  stripePeriodStart: string | null;
  stripeStatus: string;
}): boolean {
  const mappedDb = String(params.dbStatus ?? "").toLowerCase();
  const mappedStripe = String(params.stripeStatus ?? "").toLowerCase();
  if (mappedDb !== mappedStripe) return true;
  if (!params.stripePeriodStart) return false;
  const dbStart = params.dbPeriodStart;
  return dbStart !== params.stripePeriodStart;
}

export function formatBillingPeriodRange(
  periodStart: string,
  periodEnd: string | null,
): string {
  if (!periodEnd) return `Started ${periodStart}`;
  return `${periodStart} → ${periodEnd}`;
}

/**
 * Human label for when included quotas reset.
 * Stripe `current_period_end` is the renewal instant — display that date.
 */
export function formatQuotaRenewalLabel(
  periodEnd: string | null | undefined,
  options?: { short?: boolean },
): string | null {
  if (!periodEnd) return null;
  const parsed = Date.parse(`${periodEnd}T12:00:00Z`);
  if (Number.isNaN(parsed)) return null;
  const d = new Date(parsed);
  if (options?.short) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function quotaRenewsOnDate(
  periodEnd: string | null | undefined,
): string | null {
  return periodEnd ? toSqlDate(periodEnd) : null;
}

/**
 * Usage snapshot window for the billing page "Expended" card — aligned with
 * subscription period (Stripe) or calendar month, not a rolling 30-day window.
 */
export function resolveUsageSnapshotPeriod(params: {
  subscriptionPeriodStart: string | null;
  subscriptionPeriodEnd: string | null;
  calendarMonthStart?: string;
}): {
  periodStart: string;
  periodEnd: string;
  sinceUtc: string;
} {
  const monthStart =
    params.calendarMonthStart ?? currentCalendarMonthStart();
  const periodStart = params.subscriptionPeriodStart ?? monthStart;
  const periodEnd =
    params.subscriptionPeriodEnd ?? calendarMonthEnd(periodStart);
  return {
    periodStart,
    periodEnd,
    sinceUtc: `${periodStart} 00:00:00`,
  };
}
