import type { UsageDimension } from "./billing-calculator";

const COGS_SMS = 0.012;
const COGS_VOICE = 0.011;
const COGS_EMAIL = 0.0004;
const COGS_MORTGI = 0.0000007;
const STRIPE_FEE_PCT = 0.029;
const STRIPE_FEE_FIXED = 0.3;

function variableCogsUsd(dimension: UsageDimension, units: number): number {
  switch (dimension) {
    case "sms_segments":
      return units * COGS_SMS;
    case "voice_minutes":
      return units * COGS_VOICE;
    case "email_sends":
      return units * COGS_EMAIL;
    case "scheduler_bookings":
      return 0;
    case "mortgi_ai_tokens":
      return units * COGS_MORTGI;
    default:
      return 0;
  }
}

function stripeFeeUsd(amountUsd: number): number {
  if (amountUsd <= 0) return 0;
  return amountUsd * STRIPE_FEE_PCT + STRIPE_FEE_FIXED;
}

export type TopUpTier = {
  tierId: string;
  units: number;
  amountCents: number;
  label: string;
  chipLabel: string;
};

export type TopUpChannelMeta = {
  dimension: UsageDimension;
  title: string;
  unitLabel: string;
  unitLabelShort: string;
};

export const TOP_UP_CHANNELS: TopUpChannelMeta[] = [
  {
    dimension: "sms_segments",
    title: "SMS",
    unitLabel: "SMS segments",
    unitLabelShort: "segments",
  },
  {
    dimension: "voice_minutes",
    title: "Voice",
    unitLabel: "voice minutes",
    unitLabelShort: "minutes",
  },
  {
    dimension: "email_sends",
    title: "Email",
    unitLabel: "emails",
    unitLabelShort: "emails",
  },
  {
    dimension: "scheduler_bookings",
    title: "Scheduler",
    unitLabel: "bookings",
    unitLabelShort: "bookings",
  },
  {
    dimension: "mortgi_ai_tokens",
    title: "Mortgi AI",
    unitLabel: "AI tokens",
    unitLabelShort: "tokens",
  },
];

/** Tiered retail — volume steps with improved margins vs flat $18/1k SMS. */
export const TOP_UP_TIERS_BY_DIMENSION: Record<UsageDimension, TopUpTier[]> = {
  sms_segments: [
    {
      tierId: "sms_1k",
      units: 1_000,
      amountCents: 2_000,
      label: "SMS +1,000 segments",
      chipLabel: "1k",
    },
    {
      tierId: "sms_2_5k",
      units: 2_500,
      amountCents: 4_800,
      label: "SMS +2,500 segments",
      chipLabel: "2.5k",
    },
    {
      tierId: "sms_5k",
      units: 5_000,
      amountCents: 9_000,
      label: "SMS +5,000 segments",
      chipLabel: "5k",
    },
    {
      tierId: "sms_10k",
      units: 10_000,
      amountCents: 17_000,
      label: "SMS +10,000 segments",
      chipLabel: "10k",
    },
  ],
  voice_minutes: [
    {
      tierId: "voice_500",
      units: 500,
      amountCents: 1_200,
      label: "Voice +500 minutes",
      chipLabel: "500",
    },
    {
      tierId: "voice_1k",
      units: 1_000,
      amountCents: 2_000,
      label: "Voice +1,000 minutes",
      chipLabel: "1k",
    },
    {
      tierId: "voice_2_5k",
      units: 2_500,
      amountCents: 4_800,
      label: "Voice +2,500 minutes",
      chipLabel: "2.5k",
    },
    {
      tierId: "voice_5k",
      units: 5_000,
      amountCents: 9_000,
      label: "Voice +5,000 minutes",
      chipLabel: "5k",
    },
  ],
  email_sends: [
    {
      tierId: "email_1k",
      units: 1_000,
      amountCents: 600,
      label: "Email +1,000 sends",
      chipLabel: "1k",
    },
    {
      tierId: "email_5k",
      units: 5_000,
      amountCents: 2_500,
      label: "Email +5,000 sends",
      chipLabel: "5k",
    },
    {
      tierId: "email_10k",
      units: 10_000,
      amountCents: 4_500,
      label: "Email +10,000 sends",
      chipLabel: "10k",
    },
  ],
  scheduler_bookings: [
    {
      tierId: "scheduler_25",
      units: 25,
      amountCents: 700,
      label: "Scheduler +25 bookings",
      chipLabel: "25",
    },
    {
      tierId: "scheduler_50",
      units: 50,
      amountCents: 1_200,
      label: "Scheduler +50 bookings",
      chipLabel: "50",
    },
    {
      tierId: "scheduler_100",
      units: 100,
      amountCents: 2_000,
      label: "Scheduler +100 bookings",
      chipLabel: "100",
    },
  ],
  mortgi_ai_tokens: [
    {
      tierId: "mortgi_100k",
      units: 100_000,
      amountCents: 600,
      label: "Mortgi +100,000 tokens",
      chipLabel: "100k",
    },
    {
      tierId: "mortgi_250k",
      units: 250_000,
      amountCents: 1_400,
      label: "Mortgi +250,000 tokens",
      chipLabel: "250k",
    },
    {
      tierId: "mortgi_500k",
      units: 500_000,
      amountCents: 2_500,
      label: "Mortgi +500,000 tokens",
      chipLabel: "500k",
    },
  ],
};

/** Legacy deep-link pack ids → dimension + tier index. */
export const LEGACY_TOP_UP_PACK_IDS: Record<string, { dimension: UsageDimension; tierIndex: number }> =
  {
    sms_1k: { dimension: "sms_segments", tierIndex: 0 },
    voice_1k: { dimension: "voice_minutes", tierIndex: 1 },
    email_1k: { dimension: "email_sends", tierIndex: 0 },
    scheduler_50: { dimension: "scheduler_bookings", tierIndex: 1 },
    mortgi_100k: { dimension: "mortgi_ai_tokens", tierIndex: 0 },
  };

export type TopUpQuote = {
  quoteKey: string;
  tierId: string;
  dimension: UsageDimension;
  tierIndex: number;
  units: number;
  amountCents: number;
  label: string;
};

export type TopUpQuoteEconomics = {
  variableCogsUsd: number;
  stripeFeeUsd: number;
  netMarginUsd: number;
  marginPct: number;
};

export function getTopUpTiers(dimension: UsageDimension): TopUpTier[] {
  return TOP_UP_TIERS_BY_DIMENSION[dimension] ?? [];
}

export function isUsageDimension(value: string): value is UsageDimension {
  return (
    value === "sms_segments" ||
    value === "voice_minutes" ||
    value === "email_sends" ||
    value === "scheduler_bookings" ||
    value === "mortgi_ai_tokens"
  );
}

export function computeTopUpQuote(
  dimension: UsageDimension,
  tierIndex: number,
): TopUpQuote | null {
  const tiers = getTopUpTiers(dimension);
  const tier = tiers[tierIndex];
  if (!tier) return null;
  return {
    quoteKey: `${dimension}:${tier.units}`,
    tierId: tier.tierId,
    dimension,
    tierIndex,
    units: tier.units,
    amountCents: tier.amountCents,
    label: tier.label,
  };
}

export function resolveLegacyTopUpPack(
  packId: string,
): { dimension: UsageDimension; tierIndex: number } | null {
  const direct = LEGACY_TOP_UP_PACK_IDS[packId];
  if (direct) return direct;

  for (const [dimension, tiers] of Object.entries(TOP_UP_TIERS_BY_DIMENSION) as [
    UsageDimension,
    TopUpTier[],
  ][]) {
    const idx = tiers.findIndex((t) => t.tierId === packId);
    if (idx >= 0) return { dimension, tierIndex: idx };
  }
  return null;
}

export function computeTopUpQuoteEconomics(quote: TopUpQuote): TopUpQuoteEconomics {
  const retailUsd = quote.amountCents / 100;
  const variable = variableCogsUsd(quote.dimension, quote.units);
  const stripe = stripeFeeUsd(retailUsd);
  const netMarginUsd = retailUsd - variable - stripe;
  const marginPct =
    retailUsd > 0 ? Math.round((netMarginUsd / retailUsd) * 100) : 0;
  return {
    variableCogsUsd: variable,
    stripeFeeUsd: stripe,
    netMarginUsd,
    marginPct,
  };
}

/** Flatten all tiers for legacy `/packs` and pack_id lookups. */
export function buildLegacyTopUpPackCatalog(): Record<
  string,
  {
    dimension: UsageDimension;
    units: number;
    label: string;
    amountCents: number;
  }
> {
  const catalog: Record<
    string,
    { dimension: UsageDimension; units: number; label: string; amountCents: number }
  > = {};
  for (const [dimension, tiers] of Object.entries(TOP_UP_TIERS_BY_DIMENSION) as [
    UsageDimension,
    TopUpTier[],
  ][]) {
    for (const tier of tiers) {
      catalog[tier.tierId] = {
        dimension,
        units: tier.units,
        label: tier.label,
        amountCents: tier.amountCents,
      };
    }
  }
  return catalog;
}

export const TOP_UP_PACK_DEFINITIONS = buildLegacyTopUpPackCatalog();

export type TopUpPackId = string;

export function suggestTopUpDimensionFromLegacyPack(packId: string): UsageDimension {
  return resolveLegacyTopUpPack(packId)?.dimension ?? "sms_segments";
}
