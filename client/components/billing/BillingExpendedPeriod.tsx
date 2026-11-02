import { Megaphone, TrendingUp } from "lucide-react";
import type {
  BillingExpenditurePayload,
  BillingPlanSnapshot,
  BillingUsageSnapshot,
  UnifiedQuotaSummary,
} from "@shared/api";
import { resolveQuotaIncluded, usagePctAgainstCapacity } from "@/utils/billing-quota";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BillingUsageMeter } from "@/components/billing/BillingUsageMeter";
import { BillingInfraBreakdown } from "@/components/billing/BillingInfraBreakdown";
import { cn } from "@/lib/utils";

type Props = {
  usage: BillingUsageSnapshot;
  expenditure: BillingExpenditurePayload;
  plan: BillingPlanSnapshot;
  quota?: UnifiedQuotaSummary | null;
  showInternalEconomics?: boolean;
  className?: string;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function BillingExpendedPeriod({
  usage,
  expenditure,
  plan,
  quota,
  showInternalEconomics = false,
  className,
}: Props) {
  const voiceBilled = expenditure.voiceMinutesBilled;
  const broadcast = expenditure.broadcast;

  const smsIncluded = resolveQuotaIncluded(
    quota,
    "sms_segments",
    plan.includedSmsSegments,
  );
  const smsPct = usagePctAgainstCapacity(usage.totalSmsSegments, smsIncluded);
  const broadcastSmsPct = usagePctAgainstCapacity(broadcast.smsSegments, smsIncluded);
  const mortgiIncluded = resolveQuotaIncluded(
    quota,
    "mortgi_ai_tokens",
    plan.includedMortgiAiTokens,
  );
  const mortgiPct = usagePctAgainstCapacity(usage.mortgiAiTokens, mortgiIncluded);

  return (
    <Card className={cn("overflow-hidden border-primary/15", className)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Expended — current billing period
            </CardTitle>
            <CardDescription>
              {usage.periodStart} → {usage.periodEnd}
              {showInternalEconomics ? " · live DB mirror (matches budget canvas)" : ""}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Actual
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCell label="SMS segments used" value={usage.totalSmsSegments.toLocaleString()} />
          <StatCell label="Emails sent" value={usage.totalEmailSends.toLocaleString()} />
          <StatCell
            label="Voice minutes (billed)"
            value={voiceBilled.toLocaleString()}
          />
          <StatCell label="Calls logged" value={usage.callsLogged.toLocaleString()} />
        </div>

        <p className="text-xs text-muted-foreground">
          SMS split: {usage.convoSmsSegments.toLocaleString()} conversational ·{" "}
          {usage.broadcastSmsSegments.toLocaleString()} broadcast ·{" "}
          {usage.schedulerBookings.toLocaleString()} scheduler bookings · Mortgi{" "}
          {usage.mortgiAiTokens.toLocaleString()} tokens ({usage.mortgiSessions} sessions)
        </p>

        <BillingUsageMeter
          label="Mortgi AI tokens"
          used={usage.mortgiAiTokens}
          included={mortgiIncluded}
          pct={mortgiPct}
          tone="purple"
          formatValue={(n) => n.toLocaleString()}
          detail={
            showInternalEconomics
              ? `COGS ${formatUsd(expenditure.mortgiCogsUsd)}`
              : undefined
          }
        />

        <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Megaphone className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              Broadcasting — highest SMS cost
            </p>
            <Badge variant="outline" className="border-orange-500/40 text-[10px] text-orange-700">
              Unified quota
            </Badge>
          </div>
          {showInternalEconomics ? (
            <p className="text-xs text-muted-foreground">
              Blasts draw from the same SMS/email pool. One typical blast at 100 recipients × 2
              segments ≈ {formatUsd(100 * 2 * 0.012)} COGS.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Blasts draw from the same SMS/email pool as conversational messaging.
            </p>
          )}
          <BillingUsageMeter
            label="Broadcast SMS segments"
            used={broadcast.smsSegments}
            included={smsIncluded}
            pct={broadcastSmsPct}
            tone="orange"
            detail={
              showInternalEconomics
                ? `${broadcast.shareOfSmsPct}% of all SMS · ${broadcast.shareOfVariableCogsPct}% of variable COGS`
                : `${broadcast.shareOfSmsPct}% of all SMS`
            }
          />
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            {showInternalEconomics ? (
              <div>
                <p className="text-muted-foreground">Broadcast COGS</p>
                <p className="font-semibold tabular-nums text-orange-700 dark:text-orange-400">
                  {formatUsd(broadcast.cogsUsd + broadcast.emailCogsUsd)}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-muted-foreground">Share of all SMS</p>
              <p className="font-semibold tabular-nums">{broadcast.shareOfSmsPct}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">% of SMS capacity</p>
              <p className="font-semibold tabular-nums">{broadcastSmsPct}%</p>
            </div>
          </div>
        </div>

        <BillingUsageMeter
          label="All SMS segments"
          used={usage.totalSmsSegments}
          included={smsIncluded}
          pct={smsPct}
          tone="blue"
          stacked={{
            primaryLabel: "Conversational",
            primaryValue: usage.convoSmsSegments,
            secondaryLabel: "Broadcast",
            secondaryValue: usage.broadcastSmsSegments,
          }}
        />

        <div
          className={cn(
            "grid gap-4 text-sm",
            showInternalEconomics ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-1 max-w-sm",
          )}
        >
          {showInternalEconomics ? (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Variable usage COGS</p>
                <p className="font-semibold tabular-nums">
                  {formatUsd(expenditure.variableUsageCogsUsd)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Total platform COGS</p>
                <p className="font-semibold tabular-nums">
                  {formatUsd(expenditure.totalPlatformCogsUsd)}
                </p>
              </div>
            </>
          ) : null}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Owner total (fee + overage + add-ons)</p>
            <p className="font-semibold tabular-nums">{formatUsd(expenditure.ownerTotalUsd)}</p>
          </div>
          {showInternalEconomics ? (
            <>
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                <p className="text-xs text-muted-foreground">Processing fees (est.)</p>
                <p className="font-semibold tabular-nums text-orange-700 dark:text-orange-400">
                  {formatUsd(expenditure.stripeFeesUsd ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Gross margin (before fees)</p>
                <p className="font-semibold tabular-nums">
                  {formatUsd(expenditure.grossMarginUsd ?? expenditure.estimatedMarginUsd)}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg border p-3",
                  expenditure.estimatedMarginUsd < 0
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-emerald-500/30 bg-emerald-500/5",
                )}
              >
                <p className="text-xs text-muted-foreground">Net margin (after fees)</p>
                <p
                  className={cn(
                    "font-semibold tabular-nums",
                    expenditure.estimatedMarginUsd < 0
                      ? "text-destructive"
                      : "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {formatUsd(expenditure.estimatedMarginUsd)}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {showInternalEconomics && expenditure.fixedInfraBreakdown ? (
          <BillingInfraBreakdown
            breakdown={expenditure.fixedInfraBreakdown}
            totalUsd={expenditure.fixedInfraCogsUsd}
            zoomBrokerCogsUsd={expenditure.zoomBrokerCogsUsd}
          />
        ) : null}

        <p className="text-[11px] text-muted-foreground">
          Voice: {usage.voiceMinutesRecorded.toLocaleString()} min recorded on{" "}
          {usage.callsLogged.toLocaleString()} calls; billing uses{" "}
          {voiceBilled.toLocaleString()} min
          {showInternalEconomics ? " for quota/COGS" : " for quota"}. Refresh usage with the
          button above.
        </p>
      </CardContent>
    </Card>
  );
}
