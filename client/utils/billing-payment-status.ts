import type {
  BillingConfigPayload,
  BillingExpenditurePayload,
  QuotaUsageSlice,
  UnifiedQuotaSummary,
} from "@shared/api";

export type BillingPaymentStatus = {
  shouldWarn: boolean;
  paymentRequired: boolean;
  /** At or over 100% of paid-period included quota (warn or enforce). */
  quotaAtCap: boolean;
  overDimensions: string[];
  maxPct: number;
  /** Best pack for current usage pressure */
  suggestedPackId: string | null;
};

const PACK_BY_LABEL: Record<string, string> = {
  SMS: "sms_1k",
  Email: "email_1k",
  Voice: "voice_1k",
  Scheduler: "scheduler_50",
};

type QuotaDimensionSlice = {
  label: string;
  pack: string;
  slice: QuotaUsageSlice | undefined;
  expenditurePct: number | undefined;
};

/**
 * Paid billing-period quota % (subscription anchor) — not rolling 30-day expenditure.
 * Falls back to expenditure only when live quota is unavailable.
 */
export function resolveBillingPeriodQuotaPct(
  slice: QuotaUsageSlice | undefined,
  expenditurePct: number | undefined,
): number {
  if (slice != null) return slice.pct;
  return expenditurePct ?? 0;
}

function dimensionSlices(
  quota: UnifiedQuotaSummary | null | undefined,
  expenditure: BillingExpenditurePayload | null,
): QuotaDimensionSlice[] {
  return [
    {
      label: "SMS",
      pack: "sms_1k",
      slice: quota?.sms_segments,
      expenditurePct: expenditure?.pctSms,
    },
    {
      label: "Email",
      pack: "email_1k",
      slice: quota?.email_sends,
      expenditurePct: expenditure?.pctEmail,
    },
    {
      label: "Voice",
      pack: "voice_1k",
      slice: quota?.voice_minutes,
      expenditurePct: expenditure?.pctVoice,
    },
    {
      label: "Scheduler",
      pack: "scheduler_50",
      slice: quota?.scheduler_bookings,
      expenditurePct: expenditure?.pctScheduler,
    },
  ];
}

export function suggestTopUpPackId(params: {
  expenditure: BillingExpenditurePayload | null;
  quota?: UnifiedQuotaSummary | null;
}): string {
  const ranked = dimensionSlices(params.quota, params.expenditure)
    .map((d) => ({
      pack: d.pack,
      pct: resolveBillingPeriodQuotaPct(d.slice, d.expenditurePct),
    }))
    .sort((a, b) => b.pct - a.pct);
  const top = ranked[0];
  if (top && top.pct >= 70) return top.pack;
  return "sms_1k";
}

export function getBillingPaymentStatus(params: {
  config: BillingConfigPayload | null;
  expenditure: BillingExpenditurePayload | null;
  quota?: UnifiedQuotaSummary | null;
}): BillingPaymentStatus {
  const { config, expenditure, quota } = params;
  const mode = config?.billingQuotaMode ?? "off";
  const suggestedPackId = suggestTopUpPackId({ expenditure, quota });

  if (mode !== "warn" && mode !== "enforce") {
    return {
      shouldWarn: false,
      paymentRequired: false,
      quotaAtCap: false,
      overDimensions: [],
      maxPct: 0,
      suggestedPackId,
    };
  }

  const slices = dimensionSlices(quota, expenditure).map((d) => ({
    label: d.label,
    pack: d.pack,
    pct: resolveBillingPeriodQuotaPct(d.slice, d.expenditurePct),
  }));

  const maxPct = Math.max(...slices.map((s) => s.pct), 0);
  const capDims = slices.filter((s) => s.pct >= 100).map((s) => s.label);
  const warnDims = slices
    .filter((s) => s.pct >= 80 && s.pct < 100)
    .map((s) => s.label);

  const quotaAtCap = capDims.length > 0;
  const paymentRequired = mode === "enforce" && quotaAtCap;
  const shouldWarn =
    !paymentRequired && (quotaAtCap || maxPct >= 80 || warnDims.length > 0);

  const primary = capDims[0] ?? warnDims[0] ?? slices.sort((a, b) => b.pct - a.pct)[0]?.label;
  const packFromDims = primary
    ? PACK_BY_LABEL[primary] ??
      slices.find((s) => s.label === primary)?.pack
    : null;

  return {
    shouldWarn,
    paymentRequired,
    quotaAtCap,
    overDimensions: quotaAtCap ? capDims : warnDims,
    maxPct,
    suggestedPackId: packFromDims ?? suggestedPackId,
  };
}

export function billingTopUpHref(packId?: string | null): string {
  const base = "/admin/billing?topup=1";
  if (!packId) return base;
  return `${base}&pack=${encodeURIComponent(packId)}`;
}

export function formatBillingPaymentAlertCopy(status: BillingPaymentStatus): {
  title: string;
  body: string;
} {
  const dims = status.overDimensions.join(", ");
  if (status.paymentRequired) {
    return {
      title: "Payment required",
      body: `Monthly quota reached${dims ? ` (${dims})` : ""}. Add capacity to resume sends.`,
    };
  }
  if (status.quotaAtCap) {
    return {
      title: "Monthly quota reached",
      body: `You've used your included ${dims || "quota"} for this billing period (${status.maxPct}% used). Add capacity to continue sending.`,
    };
  }
  return {
    title: "Quota running low",
    body: `Approaching monthly quota${dims ? ` on ${dims}` : ""} (${status.maxPct}% of your paid period used).`,
  };
}
