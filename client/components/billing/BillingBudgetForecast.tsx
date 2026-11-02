import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Megaphone } from "lucide-react";
import {
  BILLING_PLAN_DEFAULTS,
  computeBudgetForecast,
  TENANT_1_ACTUAL_30D,
  type BillingPlanConfig,
  type BudgetForecastInputs,
} from "@shared/billing-calculator";
import type { BillingPlanSnapshot } from "@shared/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BillingUsageMeter } from "@/components/billing/BillingUsageMeter";
import { cn } from "@/lib/utils";

type Props = {
  plan?: BillingPlanSnapshot;
  showInternalEconomics?: boolean;
  className?: string;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const DEFAULT_INPUTS: BudgetForecastInputs = {
  convoSmsPerMonth: TENANT_1_ACTUAL_30D.convoSmsSegments,
  convoEmailPerMonth: TENANT_1_ACTUAL_30D.totalEmailSends - TENANT_1_ACTUAL_30D.broadcastEmailSends,
  voiceMinutesPerMonth: TENANT_1_ACTUAL_30D.voiceMinutesEstimated ?? TENANT_1_ACTUAL_30D.voiceMinutesRecorded,
  schedulerBookingsPerMonth: TENANT_1_ACTUAL_30D.schedulerBookings,
  blastsPerMonth: 2,
  recipientsPerBlast: 250,
  smsSegmentsPerRecipient: 2,
  emailPerBlast: true,
  extraTwilioNumbers: 0,
  zoomBrokerLicenses: 0,
  mortgiAiTokensPerMonth: TENANT_1_ACTUAL_30D.mortgiAiTokens,
};

function ForecastField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-9 tabular-nums"
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function BillingBudgetForecast({
  plan,
  showInternalEconomics = false,
  className,
}: Props) {
  const [inputs, setInputs] = useState<BudgetForecastInputs>(DEFAULT_INPUTS);
  const resolvedPlan = useMemo(
    () => ({ ...BILLING_PLAN_DEFAULTS, ...plan }) as BillingPlanConfig,
    [plan],
  );

  const forecast = useMemo(
    () => computeBudgetForecast(inputs, resolvedPlan),
    [inputs, resolvedPlan],
  );

  const patch = (partial: Partial<BudgetForecastInputs>) =>
    setInputs((prev) => ({ ...prev, ...partial }));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          Budget forecast calculator
        </CardTitle>
        <CardDescription>
          Model monthly owner spend from conversational usage + broadcast assumptions. Uses plan
          defaults from <code className="text-xs">billing-calculator</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ForecastField
            id="convo-sms"
            label="Conversational SMS segments / mo"
            value={inputs.convoSmsPerMonth}
            onChange={(n) => patch({ convoSmsPerMonth: n })}
          />
          <ForecastField
            id="convo-email"
            label="Conversational email sends / mo"
            value={inputs.convoEmailPerMonth}
            onChange={(n) => patch({ convoEmailPerMonth: n })}
          />
          <ForecastField
            id="voice-min"
            label="Voice minutes / mo"
            value={inputs.voiceMinutesPerMonth}
            onChange={(n) => patch({ voiceMinutesPerMonth: n })}
          />
          <ForecastField
            id="scheduler"
            label="Scheduler bookings / mo"
            value={inputs.schedulerBookingsPerMonth}
            onChange={(n) => patch({ schedulerBookingsPerMonth: n })}
          />
          <ForecastField
            id="mortgi"
            label="Mortgi AI tokens / mo"
            value={inputs.mortgiAiTokensPerMonth}
            onChange={(n) => patch({ mortgiAiTokensPerMonth: n })}
          />
          <ForecastField
            id="twilio"
            label="Extra SMS numbers"
            value={inputs.extraTwilioNumbers}
            onChange={(n) => patch({ extraTwilioNumbers: n })}
          />
          <ForecastField
            id="zoom"
            label="Zoom broker licenses"
            value={inputs.zoomBrokerLicenses}
            onChange={(n) => patch({ zoomBrokerLicenses: n })}
          />
        </div>

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400">
            <Megaphone className="h-4 w-4" />
            Broadcast assumptions
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ForecastField
              id="blasts"
              label="Blasts / mo"
              value={inputs.blastsPerMonth}
              onChange={(n) => patch({ blastsPerMonth: n })}
            />
            <ForecastField
              id="recipients"
              label="Recipients / blast"
              value={inputs.recipientsPerBlast}
              onChange={(n) => patch({ recipientsPerBlast: n })}
            />
            <ForecastField
              id="segments"
              label="SMS segments / recipient"
              value={inputs.smsSegmentsPerRecipient}
              onChange={(n) => patch({ smsSegmentsPerRecipient: n })}
              hint="ceil(body length / 160)"
            />
            <div className="flex items-end gap-3 pb-1">
              <Switch
                id="email-blast"
                checked={inputs.emailPerBlast}
                onCheckedChange={(checked) => patch({ emailPerBlast: checked })}
              />
              <Label htmlFor="email-blast" className="text-sm">
                Include email per blast
              </Label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <BillingUsageMeter
              label="SMS segments (forecast)"
              used={forecast.totalSmsSegments}
              included={resolvedPlan.includedSmsSegments}
              pct={forecast.pctSms}
              tone="blue"
              stacked={{
                primaryLabel: "Conversational",
                primaryValue: inputs.convoSmsPerMonth,
                secondaryLabel: "Broadcast",
                secondaryValue: forecast.blastSmsSegments,
              }}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <BillingUsageMeter
              label="Email sends (forecast)"
              used={forecast.totalEmailSends}
              included={resolvedPlan.includedEmailSends}
              pct={forecast.pctEmail}
              tone="blue"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <BillingUsageMeter
              label="Voice minutes (forecast)"
              used={forecast.totalVoiceMinutes}
              included={resolvedPlan.includedVoiceMinutes}
              pct={forecast.pctVoice}
              tone="blue"
            />
          </motion.div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Platform fee</p>
            <p className="text-lg font-semibold tabular-nums">{formatUsd(forecast.platformFeeUsd)}/mo</p>
          </div>
          <div>
            <p className="text-muted-foreground">Overage retail</p>
            <p className="text-lg font-semibold tabular-nums">{formatUsd(forecast.overageRetailUsd)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Add-ons</p>
            <p className="text-lg font-semibold tabular-nums">{formatUsd(forecast.addonsUsd)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Owner total (est.)</p>
            <p className="text-lg font-bold tabular-nums text-primary">{formatUsd(forecast.ownerTotalUsd)}</p>
          </div>
          {showInternalEconomics ? (
            <>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Est. platform COGS</p>
                <p className="font-medium tabular-nums">{formatUsd(forecast.estimatedCogsUsd)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Processing fees (est.)</p>
                <p className="font-medium tabular-nums text-orange-700 dark:text-orange-400">
                  {formatUsd(forecast.stripeFeesUsd)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Gross margin</p>
                <p className="font-medium tabular-nums">{formatUsd(forecast.grossMarginUsd)}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-muted-foreground">Net margin (after fees)</p>
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    forecast.estimatedMarginUsd < 0
                      ? "text-destructive"
                      : "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {formatUsd(forecast.estimatedMarginUsd)}
                </p>
              </div>
              <div className="lg:col-span-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                Broadcast COGS: {formatUsd(forecast.broadcast.cogsUsd + forecast.broadcast.emailCogsUsd)} ·{" "}
                {forecast.broadcast.shareOfSmsPct}% of SMS · cost/blast ~
                {formatUsd(forecast.broadcast.costPerBlastUsd)}
              </div>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
