import type { UsageDimension } from "@shared/api";
import type { BillingTopUpChannelOption } from "@shared/api";
import type { UnifiedQuotaSummary } from "@shared/api";
import { resolveLegacyTopUpPack } from "@shared/billing-top-up";

export const TOP_UP_DIMENSION_ORDER: UsageDimension[] = [
  "sms_segments",
  "voice_minutes",
  "email_sends",
  "scheduler_bookings",
  "mortgi_ai_tokens",
];

export function resolveInitialTopUpSelection(params: {
  topUpOptions: BillingTopUpChannelOption[];
  initialPackId?: string | null;
  recommendedPackId?: string | null;
  quota?: UnifiedQuotaSummary | null;
}): { dimension: UsageDimension; tierIndex: number } {
  const { topUpOptions, initialPackId, recommendedPackId, quota } = params;
  const packHint = initialPackId ?? recommendedPackId;
  if (packHint) {
    const legacy = resolveLegacyTopUpPack(packHint);
    if (legacy) return legacy;
  }

  if (quota) {
    const pcts: Array<{ dimension: UsageDimension; pct: number }> = [
      { dimension: "sms_segments", pct: quota.sms_segments.pct },
      { dimension: "voice_minutes", pct: quota.voice_minutes.pct },
      { dimension: "email_sends", pct: quota.email_sends.pct },
      { dimension: "scheduler_bookings", pct: quota.scheduler_bookings.pct },
      { dimension: "mortgi_ai_tokens", pct: quota.mortgi_ai_tokens.pct },
    ];
    pcts.sort((a, b) => b.pct - a.pct);
    const top = pcts[0];
    if (top.pct >= 70) {
      const channel = topUpOptions.find((c) => c.dimension === top.dimension);
      if (channel) {
        return {
          dimension: top.dimension,
          tierIndex: suggestTierIndexForQuota(channel, quota),
        };
      }
    }
  }

  return { dimension: "sms_segments", tierIndex: 0 };
}

export function suggestTierIndexForQuota(
  channel: BillingTopUpChannelOption,
  quota: UnifiedQuotaSummary,
): number {
  const slice = quota[channel.dimension as keyof UnifiedQuotaSummary];
  if (!slice || typeof slice !== "object" || !("used" in slice)) return 0;
  const needed = Math.max(0, slice.used + slice.reserved - slice.included);
  if (needed <= 0) return 0;
  const idx = channel.tiers.findIndex((t) => t.units >= needed);
  return idx >= 0 ? idx : Math.max(0, channel.tiers.length - 1);
}

export function quotaPctForDimension(
  dimension: UsageDimension,
  quota: UnifiedQuotaSummary | null | undefined,
): number | null {
  if (!quota) return null;
  switch (dimension) {
    case "sms_segments":
      return quota.sms_segments.pct;
    case "voice_minutes":
      return quota.voice_minutes.pct;
    case "email_sends":
      return quota.email_sends.pct;
    case "scheduler_bookings":
      return quota.scheduler_bookings.pct;
    case "mortgi_ai_tokens":
      return quota.mortgi_ai_tokens.pct;
    default:
      return null;
  }
}

export function formatTopUpUnits(units: number, dimension: UsageDimension): string {
  if (dimension === "mortgi_ai_tokens" && units >= 1_000_000) {
    return `${(units / 1_000_000).toFixed(units % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (units >= 1_000) {
    return `${(units / 1_000).toFixed(units % 1_000 === 0 ? 0 : 1)}k`;
  }
  return units.toLocaleString();
}
