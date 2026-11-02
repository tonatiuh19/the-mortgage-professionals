/**
 * Platform-owner budget & expenditure math — aligned with live .env services.
 * @see docs/BILLING_AND_QUOTA_PLAN.md · docs/INFRASTRUCTURE_COST_AUDIT.md
 */

/** Fixed infra line items (Vercel, Ably, TiDB, Resend, CDN/IMAP, 10DLC, Zoom API). */
export const FIXED_INFRA_BREAKDOWN = {
  vercelUsd: 65,
  ablyUsd: 63,
  tidbUsd: 38,
  resendUsd: 20,
  /** disruptinglabs CDN + Hostgator IMAP inbound */
  cdnHostgatorImapUsd: 15,
  /** US A2P 10DLC campaign amortized */
  tenDlcAmortizedUsd: 10,
  /** Single Zoom API / central scheduler license */
  zoomApiLicenseUsd: 16,
} as const;

export type FixedInfraBreakdown = typeof FIXED_INFRA_BREAKDOWN;

export function sumFixedInfraBreakdown(
  lines: FixedInfraBreakdown = FIXED_INFRA_BREAKDOWN,
): number {
  return (
    lines.vercelUsd +
    lines.ablyUsd +
    lines.tidbUsd +
    lines.resendUsd +
    lines.cdnHostgatorImapUsd +
    lines.tenDlcAmortizedUsd +
    lines.zoomApiLicenseUsd
  );
}

export const BILLING_PLAN_DEFAULTS = {
  platformFeeUsd: 350,
  includedSmsSegments: 1000,
  includedVoiceMinutes: 1500,
  includedEmailSends: 5000,
  includedSchedulerBookings: 100,
  includedMortgiAiTokens: 500_000,
  overageSmsPer1kUsd: 20,
  overageVoicePer1kUsd: 20,
  overageEmailPer1kUsd: 6,
  overageSchedulerPer50Usd: 12,
  overageMortgiPer100kTokensUsd: 6,
  /** Twilio US long-code all-in (base + carrier) */
  cogsSmsPerSegmentUsd: 0.012,
  /** Twilio US voice blended */
  cogsVoicePerMinuteUsd: 0.011,
  /** Resend Pro marginal per send (plan fee in fixed infra) */
  cogsEmailPerSendUsd: 0.0004,
  /** Groq llama-3.3-70b blended */
  cogsMortgiPerTokenUsd: 0.0000007,
  /** WhatsApp/MMS often cost more — planning uplift when metered as SMS */
  cogsWhatsappPerMessageUsd: 0.005,
  cogsMmsPerMessageUsd: 0.022,
  cogsTwilioNumberPerMonthUsd: 1.15,
  /** Stripe US card-not-present */
  cogsStripeFeePct: 0.029,
  cogsStripeFeeFixedUsd: 0.3,
  fixedInfraBreakdown: FIXED_INFRA_BREAKDOWN,
  /** Sum of FIXED_INFRA_BREAKDOWN — replaces opaque $340 lump */
  fixedInfraCogsUsd: sumFixedInfraBreakdown(),
  twilioNumberAddonUsd: 9,
  /** Retail per broker Zoom seat (annual $13.33/mo) */
  zoomPerBrokerUsd: 13.33,
  /** COGS per broker Zoom seat (pass-through) */
  zoomPerBrokerCogsUsd: 13.33,
} as const;

export type BillingPlanConfig = typeof BILLING_PLAN_DEFAULTS;

export type UsageDimension =
  | "sms_segments"
  | "voice_minutes"
  | "email_sends"
  | "scheduler_bookings"
  | "mortgi_ai_tokens";

import {
  TOP_UP_PACK_DEFINITIONS,
  TOP_UP_CHANNELS,
  TOP_UP_TIERS_BY_DIMENSION,
  computeTopUpQuote,
  computeTopUpQuoteEconomics,
  resolveLegacyTopUpPack,
  getTopUpTiers,
  isUsageDimension,
  suggestTopUpDimensionFromLegacyPack,
  type TopUpPackId,
  type TopUpTier,
  type TopUpQuote,
  type TopUpChannelMeta,
} from "./billing-top-up";

export {
  TOP_UP_PACK_DEFINITIONS,
  TOP_UP_CHANNELS,
  TOP_UP_TIERS_BY_DIMENSION,
  computeTopUpQuote,
  computeTopUpQuoteEconomics,
  resolveLegacyTopUpPack,
  getTopUpTiers,
  isUsageDimension,
  suggestTopUpDimensionFromLegacyPack,
  type TopUpPackId,
  type TopUpTier,
  type TopUpQuote,
  type TopUpChannelMeta,
};

export type TopUpPackEconomics = {
  packId: string;
  retailUsd: number;
  variableCogsUsd: number;
  stripeFeeUsd: number;
  netMarginUsd: number;
  marginPct: number;
};

export function computeTopUpPackEconomics(
  packId: string,
  plan: BillingPlanConfig = BILLING_PLAN_DEFAULTS,
): TopUpPackEconomics {
  const pack = TOP_UP_PACK_DEFINITIONS[packId];
  if (!pack) {
    return {
      packId,
      retailUsd: 0,
      variableCogsUsd: 0,
      stripeFeeUsd: 0,
      netMarginUsd: 0,
      marginPct: 0,
    };
  }
  const retailUsd = pack.amountCents / 100;
  const variableCogsUsd = computePackVariableCogsUsd(pack.dimension, pack.units, plan);
  const stripeFeeUsd = computeStripeProcessingFeeUsd(retailUsd, plan);
  const netMarginUsd = retailUsd - variableCogsUsd - stripeFeeUsd;
  const marginPct =
    retailUsd > 0 ? Math.round((netMarginUsd / retailUsd) * 100) : 0;
  return {
    packId,
    retailUsd,
    variableCogsUsd,
    stripeFeeUsd,
    netMarginUsd,
    marginPct,
  };
}

export function computeAllTopUpPackEconomics(
  plan: BillingPlanConfig = BILLING_PLAN_DEFAULTS,
): TopUpPackEconomics[] {
  return Object.keys(TOP_UP_PACK_DEFINITIONS).map((id) =>
    computeTopUpPackEconomics(id, plan),
  );
}

export function computeStripeProcessingFeeUsd(
  amountUsd: number,
  plan: BillingPlanConfig = BILLING_PLAN_DEFAULTS,
): number {
  if (amountUsd <= 0) return 0;
  return amountUsd * plan.cogsStripeFeePct + plan.cogsStripeFeeFixedUsd;
}

export function computePackVariableCogsUsd(
  dimension: UsageDimension,
  units: number,
  plan: BillingPlanConfig = BILLING_PLAN_DEFAULTS,
): number {
  switch (dimension) {
    case "sms_segments":
      return units * plan.cogsSmsPerSegmentUsd;
    case "voice_minutes":
      return units * plan.cogsVoicePerMinuteUsd;
    case "email_sends":
      return units * plan.cogsEmailPerSendUsd;
    case "scheduler_bookings":
      return 0;
    case "mortgi_ai_tokens":
      return units * plan.cogsMortgiPerTokenUsd;
    default:
      return 0;
  }
}

export type BudgetForecastInputs = {
  convoSmsPerMonth: number;
  convoEmailPerMonth: number;
  voiceMinutesPerMonth: number;
  schedulerBookingsPerMonth: number;
  blastsPerMonth: number;
  recipientsPerBlast: number;
  smsSegmentsPerRecipient: number;
  emailPerBlast: boolean;
  extraTwilioNumbers: number;
  zoomBrokerLicenses: number;
  mortgiAiTokensPerMonth: number;
};

export type UsageSnapshot = {
  periodStart: string;
  periodEnd: string;
  tenantId: number;
  totalSmsSegments: number;
  broadcastSmsSegments: number;
  convoSmsSegments: number;
  totalEmailSends: number;
  broadcastEmailSends: number;
  callsLogged: number;
  voiceMinutesRecorded: number;
  voiceMinutesEstimated?: number;
  schedulerBookings: number;
  mortgiAiTokens: number;
  mortgiSessions: number;
  mortgiUserMessages: number;
};

export const TENANT_1_ACTUAL_30D: UsageSnapshot = {
  periodStart: "2026-05-06",
  periodEnd: "2026-06-05",
  tenantId: 1,
  totalSmsSegments: 831,
  broadcastSmsSegments: 418,
  convoSmsSegments: 413,
  totalEmailSends: 1037,
  broadcastEmailSends: 0,
  callsLogged: 289,
  voiceMinutesRecorded: 158,
  voiceMinutesEstimated: 694,
  schedulerBookings: 7,
  mortgiAiTokens: 802,
  mortgiSessions: 1,
  mortgiUserMessages: 1,
};

export type BroadcastEconomics = {
  blastsPerMonth: number;
  recipientsPerBlast: number;
  segmentsPerRecipient: number;
  smsSegments: number;
  emailSends: number;
  cogsUsd: number;
  emailCogsUsd: number;
  costPerBlastUsd: number;
  shareOfSmsPct: number;
  shareOfVariableCogsPct: number;
  pctOfIncludedSms: number;
  pctOfIncludedEmail: number;
  smsOverageAttributed: number;
  overageRetailAttributedUsd: number;
};

export function computeBroadcastEconomics(
  params: {
    blastsPerMonth: number;
    recipientsPerBlast: number;
    segmentsPerRecipient: number;
    emailPerBlast: boolean;
    totalSmsSegments: number;
    totalEmailSends: number;
    convoSmsSegments: number;
    convoEmailSends: number;
    overSms: number;
  },
  plan: BillingPlanConfig = BILLING_PLAN_DEFAULTS,
): BroadcastEconomics {
  const smsSegments =
    params.blastsPerMonth *
    params.recipientsPerBlast *
    params.segmentsPerRecipient;
  const emailSends = params.emailPerBlast
    ? params.blastsPerMonth * params.recipientsPerBlast
    : 0;

  const cogsUsd = smsSegments * plan.cogsSmsPerSegmentUsd;
  const emailCogsUsd = emailSends * plan.cogsEmailPerSendUsd;
  const variableCogs =
    params.totalSmsSegments * plan.cogsSmsPerSegmentUsd +
    params.totalEmailSends * plan.cogsEmailPerSendUsd;
  const broadcastVariable = cogsUsd + emailCogsUsd;

  const costPerBlastUsd =
    params.blastsPerMonth > 0
      ? (cogsUsd + emailCogsUsd) / params.blastsPerMonth
      : 0;

  const smsOverageAttributed = Math.min(smsSegments, params.overSms);
  const overageRetailAttributedUsd =
    ceilDiv(smsOverageAttributed, 1000) * plan.overageSmsPer1kUsd;

  return {
    blastsPerMonth: params.blastsPerMonth,
    recipientsPerBlast: params.recipientsPerBlast,
    segmentsPerRecipient: params.segmentsPerRecipient,
    smsSegments,
    emailSends,
    cogsUsd,
    emailCogsUsd,
    costPerBlastUsd,
    shareOfSmsPct:
      params.totalSmsSegments > 0
        ? Math.round((smsSegments / params.totalSmsSegments) * 100)
        : 0,
    shareOfVariableCogsPct:
      variableCogs > 0 ? Math.round((broadcastVariable / variableCogs) * 100) : 0,
    pctOfIncludedSms: pct(smsSegments, plan.includedSmsSegments),
    pctOfIncludedEmail: pct(emailSends, plan.includedEmailSends),
    smsOverageAttributed,
    overageRetailAttributedUsd,
  };
}

export type BudgetBreakdown = {
  blastSmsSegments: number;
  blastEmailSends: number;
  broadcast: BroadcastEconomics;
  totalSmsSegments: number;
  totalEmailSends: number;
  totalVoiceMinutes: number;
  totalSchedulerBookings: number;
  totalMortgiAiTokens: number;
  overSms: number;
  overVoice: number;
  overEmail: number;
  overScheduler: number;
  overMortgiAiTokens: number;
  mortgiCogsUsd: number;
  overageRetailUsd: number;
  platformFeeUsd: number;
  addonsUsd: number;
  ownerTotalUsd: number;
  variableCogsUsd: number;
  fixedInfraCogsUsd: number;
  fixedInfraBreakdown: FixedInfraBreakdown;
  zoomBrokerCogsUsd: number;
  estimatedCogsUsd: number;
  stripeFeesUsd: number;
  grossMarginUsd: number;
  estimatedMarginUsd: number;
  pctSms: number;
  pctVoice: number;
  pctEmail: number;
  pctScheduler: number;
  pctMortgiAiTokens: number;
};

export type ExpenditureBreakdown = {
  usage: UsageSnapshot;
  broadcast: BroadcastEconomics;
  voiceMinutesBilled: number;
  variableUsageCogsUsd: number;
  fixedInfraCogsUsd: number;
  fixedInfraBreakdown: FixedInfraBreakdown;
  zoomBrokerCogsUsd: number;
  totalPlatformCogsUsd: number;
  overageRetailUsd: number;
  platformFeeUsd: number;
  addonsUsd: number;
  ownerTotalUsd: number;
  stripeFeesUsd: number;
  grossMarginUsd: number;
  /** Net margin after vendor COGS + Stripe processing */
  estimatedMarginUsd: number;
  pctSms: number;
  pctVoice: number;
  pctEmail: number;
  pctScheduler: number;
  pctMortgiAiTokens: number;
  mortgiCogsUsd: number;
};

function ceilDiv(a: number, b: number): number {
  return b <= 0 ? 0 : Math.ceil(a / b);
}

function pct(used: number, included: number): number {
  return included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0;
}

function computeRevenueStripeFees(
  platformFeeUsd: number,
  overageRetailUsd: number,
  addonsUsd: number,
  plan: BillingPlanConfig = BILLING_PLAN_DEFAULTS,
): number {
  let fees = computeStripeProcessingFeeUsd(platformFeeUsd, plan);
  if (overageRetailUsd > 0) {
    fees += computeStripeProcessingFeeUsd(overageRetailUsd, plan);
  }
  if (addonsUsd > 0) {
    fees += computeStripeProcessingFeeUsd(addonsUsd, plan);
  }
  return fees;
}

export function computeBudgetForecast(
  inputs: BudgetForecastInputs,
  plan: BillingPlanConfig = BILLING_PLAN_DEFAULTS,
): BudgetBreakdown {
  const blastSmsSegments =
    inputs.blastsPerMonth *
    inputs.recipientsPerBlast *
    inputs.smsSegmentsPerRecipient;
  const blastEmailSends = inputs.emailPerBlast
    ? inputs.blastsPerMonth * inputs.recipientsPerBlast
    : 0;

  const totalSmsSegments = inputs.convoSmsPerMonth + blastSmsSegments;
  const totalEmailSends = inputs.convoEmailPerMonth + blastEmailSends;
  const totalVoiceMinutes = inputs.voiceMinutesPerMonth;
  const totalSchedulerBookings = inputs.schedulerBookingsPerMonth;

  const overSms = Math.max(0, totalSmsSegments - plan.includedSmsSegments);
  const overVoice = Math.max(0, totalVoiceMinutes - plan.includedVoiceMinutes);
  const overEmail = Math.max(0, totalEmailSends - plan.includedEmailSends);
  const overScheduler = Math.max(
    0,
    totalSchedulerBookings - plan.includedSchedulerBookings,
  );
  const totalMortgiAiTokens = inputs.mortgiAiTokensPerMonth;
  const overMortgiAiTokens = Math.max(
    0,
    totalMortgiAiTokens - plan.includedMortgiAiTokens,
  );

  const overageRetailUsd =
    ceilDiv(overSms, 1000) * plan.overageSmsPer1kUsd +
    ceilDiv(overVoice, 1000) * plan.overageVoicePer1kUsd +
    ceilDiv(overEmail, 1000) * plan.overageEmailPer1kUsd +
    ceilDiv(overScheduler, 50) * plan.overageSchedulerPer50Usd +
    ceilDiv(overMortgiAiTokens, 100_000) * plan.overageMortgiPer100kTokensUsd;

  const platformFeeUsd = plan.platformFeeUsd;
  const addonsUsd =
    inputs.extraTwilioNumbers * plan.twilioNumberAddonUsd +
    inputs.zoomBrokerLicenses * plan.zoomPerBrokerUsd;

  const ownerTotalUsd = platformFeeUsd + overageRetailUsd + addonsUsd;

  const mortgiCogsUsd = totalMortgiAiTokens * plan.cogsMortgiPerTokenUsd;
  const variableCogsUsd =
    totalSmsSegments * plan.cogsSmsPerSegmentUsd +
    totalVoiceMinutes * plan.cogsVoicePerMinuteUsd +
    totalEmailSends * plan.cogsEmailPerSendUsd +
    mortgiCogsUsd +
    inputs.extraTwilioNumbers * plan.cogsTwilioNumberPerMonthUsd;

  const fixedInfraCogsUsd = sumFixedInfraBreakdown(plan.fixedInfraBreakdown);
  const zoomBrokerCogsUsd =
    inputs.zoomBrokerLicenses * plan.zoomPerBrokerCogsUsd;
  const estimatedCogsUsd =
    fixedInfraCogsUsd + variableCogsUsd + zoomBrokerCogsUsd;

  const stripeFeesUsd = computeRevenueStripeFees(
    platformFeeUsd,
    overageRetailUsd,
    addonsUsd,
    plan,
  );
  const grossMarginUsd = ownerTotalUsd - estimatedCogsUsd;
  const estimatedMarginUsd = grossMarginUsd - stripeFeesUsd;

  const broadcast = computeBroadcastEconomics(
    {
      blastsPerMonth: inputs.blastsPerMonth,
      recipientsPerBlast: inputs.recipientsPerBlast,
      segmentsPerRecipient: inputs.smsSegmentsPerRecipient,
      emailPerBlast: inputs.emailPerBlast,
      totalSmsSegments,
      totalEmailSends,
      convoSmsSegments: inputs.convoSmsPerMonth,
      convoEmailSends: inputs.convoEmailPerMonth,
      overSms,
    },
    plan,
  );

  return {
    blastSmsSegments,
    blastEmailSends,
    broadcast,
    totalSmsSegments,
    totalEmailSends,
    totalVoiceMinutes,
    totalSchedulerBookings,
    totalMortgiAiTokens,
    overSms,
    overVoice,
    overEmail,
    overScheduler,
    overMortgiAiTokens,
    mortgiCogsUsd,
    overageRetailUsd,
    platformFeeUsd,
    addonsUsd,
    ownerTotalUsd,
    variableCogsUsd,
    fixedInfraCogsUsd,
    fixedInfraBreakdown: plan.fixedInfraBreakdown,
    zoomBrokerCogsUsd,
    estimatedCogsUsd,
    stripeFeesUsd,
    grossMarginUsd,
    estimatedMarginUsd,
    pctSms: pct(totalSmsSegments, plan.includedSmsSegments),
    pctVoice: pct(totalVoiceMinutes, plan.includedVoiceMinutes),
    pctEmail: pct(totalEmailSends, plan.includedEmailSends),
    pctScheduler: pct(totalSchedulerBookings, plan.includedSchedulerBookings),
    pctMortgiAiTokens: pct(totalMortgiAiTokens, plan.includedMortgiAiTokens),
  };
}

export type ExpenditureOptions = {
  extraTwilioNumbers?: number;
  /** Extra broker Zoom seats beyond the central API license in fixed infra */
  zoomBrokerLicenses?: number;
  preferEstimatedVoiceMinutes?: boolean;
};

export function computeActualExpenditure(
  usage: UsageSnapshot,
  options: ExpenditureOptions = {},
  plan: BillingPlanConfig = BILLING_PLAN_DEFAULTS,
): ExpenditureBreakdown {
  const extraTwilioNumbers = options.extraTwilioNumbers ?? 0;
  const zoomBrokerLicenses = options.zoomBrokerLicenses ?? 0;

  const voiceMinutesBilled =
    options.preferEstimatedVoiceMinutes && usage.voiceMinutesEstimated != null
      ? usage.voiceMinutesEstimated
      : Math.max(usage.voiceMinutesRecorded, usage.voiceMinutesEstimated ?? 0);

  const mortgiCogsUsd = usage.mortgiAiTokens * plan.cogsMortgiPerTokenUsd;
  const variableUsageCogsUsd =
    usage.totalSmsSegments * plan.cogsSmsPerSegmentUsd +
    voiceMinutesBilled * plan.cogsVoicePerMinuteUsd +
    usage.totalEmailSends * plan.cogsEmailPerSendUsd +
    mortgiCogsUsd +
    extraTwilioNumbers * plan.cogsTwilioNumberPerMonthUsd;

  const fixedInfraCogsUsd = sumFixedInfraBreakdown(plan.fixedInfraBreakdown);
  const zoomBrokerCogsUsd = zoomBrokerLicenses * plan.zoomPerBrokerCogsUsd;
  const totalPlatformCogsUsd =
    fixedInfraCogsUsd + variableUsageCogsUsd + zoomBrokerCogsUsd;

  const forecast = computeBudgetForecast(
    {
      convoSmsPerMonth: usage.convoSmsSegments,
      convoEmailPerMonth: usage.totalEmailSends - usage.broadcastEmailSends,
      voiceMinutesPerMonth: voiceMinutesBilled,
      schedulerBookingsPerMonth: usage.schedulerBookings,
      blastsPerMonth: 0,
      recipientsPerBlast: 0,
      smsSegmentsPerRecipient: 1,
      emailPerBlast: false,
      extraTwilioNumbers,
      zoomBrokerLicenses,
      mortgiAiTokensPerMonth: usage.mortgiAiTokens,
    },
    plan,
  );

  const ownerTotalUsd = forecast.ownerTotalUsd;
  const stripeFeesUsd = forecast.stripeFeesUsd;
  const grossMarginUsd = ownerTotalUsd - totalPlatformCogsUsd;
  const estimatedMarginUsd = grossMarginUsd - stripeFeesUsd;

  const broadcast = computeBroadcastEconomics(
    {
      blastsPerMonth: 0,
      recipientsPerBlast: 0,
      segmentsPerRecipient: 1,
      emailPerBlast: false,
      totalSmsSegments: usage.totalSmsSegments,
      totalEmailSends: usage.totalEmailSends,
      convoSmsSegments: usage.convoSmsSegments,
      convoEmailSends: usage.totalEmailSends - usage.broadcastEmailSends,
      overSms: forecast.overSms,
    },
    plan,
  );

  const broadcastCogsUsd =
    usage.broadcastSmsSegments * plan.cogsSmsPerSegmentUsd +
    usage.broadcastEmailSends * plan.cogsEmailPerSendUsd;
  const broadcastActual: BroadcastEconomics = {
    ...broadcast,
    smsSegments: usage.broadcastSmsSegments,
    emailSends: usage.broadcastEmailSends,
    cogsUsd: usage.broadcastSmsSegments * plan.cogsSmsPerSegmentUsd,
    emailCogsUsd: usage.broadcastEmailSends * plan.cogsEmailPerSendUsd,
    costPerBlastUsd: 0,
    shareOfSmsPct:
      usage.totalSmsSegments > 0
        ? Math.round(
            (usage.broadcastSmsSegments / usage.totalSmsSegments) * 100,
          )
        : 0,
    shareOfVariableCogsPct:
      variableUsageCogsUsd > 0
        ? Math.round((broadcastCogsUsd / variableUsageCogsUsd) * 100)
        : 0,
    pctOfIncludedSms: pct(
      usage.broadcastSmsSegments,
      plan.includedSmsSegments,
    ),
    pctOfIncludedEmail: pct(
      usage.broadcastEmailSends,
      plan.includedEmailSends,
    ),
  };

  return {
    usage,
    broadcast: broadcastActual,
    voiceMinutesBilled,
    variableUsageCogsUsd,
    fixedInfraCogsUsd,
    fixedInfraBreakdown: plan.fixedInfraBreakdown,
    zoomBrokerCogsUsd,
    totalPlatformCogsUsd,
    overageRetailUsd: forecast.overageRetailUsd,
    platformFeeUsd: plan.platformFeeUsd,
    addonsUsd: forecast.addonsUsd,
    ownerTotalUsd,
    stripeFeesUsd,
    grossMarginUsd,
    estimatedMarginUsd,
    pctSms: pct(usage.totalSmsSegments, plan.includedSmsSegments),
    pctVoice: pct(voiceMinutesBilled, plan.includedVoiceMinutes),
    pctEmail: pct(usage.totalEmailSends, plan.includedEmailSends),
    pctScheduler: pct(usage.schedulerBookings, plan.includedSchedulerBookings),
    pctMortgiAiTokens: pct(usage.mortgiAiTokens, plan.includedMortgiAiTokens),
    mortgiCogsUsd,
  };
}
