import React, { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CreditCard,
  RefreshCw,
  Shield,
  Megaphone,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BillingUsageMeter } from "@/components/billing/BillingUsageMeter";
import { BillingBudgetForecast } from "@/components/billing/BillingBudgetForecast";
import { BillingExpendedPeriod } from "@/components/billing/BillingExpendedPeriod";
import { StripePlatformSubscription } from "@/components/billing/StripePlatformSubscription";
import { BillingOverduePayCard } from "@/components/billing/BillingOverduePayCard";
import { StripeTopUpCheckout } from "@/components/billing/StripeTopUpCheckout";
import { BILLING_PLAN_DEFAULTS } from "@shared/billing-calculator";
import {
  formatBillingAccessLabel,
  formatQuotaModeLabel,
  sanitizeBillingError,
} from "@/utils/billing-ui-copy";
import { BillingPurchaseHistory } from "@/components/billing/BillingPurchaseHistory";
import { BillingGraceCountdownBadge } from "@/components/billing/BillingAccessBanner";
import { BillingPaymentAlert } from "@/components/billing/BillingPaymentAlert";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearLastFulfillment,
  confirmStripePayment,
  fetchBillingAccess,
  fetchBillingConfig,
  fetchBillingQuota,
  fetchBillingPurchases,
  fetchBillingUsage,
  fetchTopUpOptions,
} from "@/store/slices/billingSlice";
import { getBillingPaymentStatus } from "@/utils/billing-payment-status";
import {
  resolveQuotaIncluded,
  usagePctAgainstCapacity,
} from "@/utils/billing-quota";
import { showBillingInternalEconomics } from "@/utils/billing-internal";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function modeBadgeVariant(
  mode: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (mode) {
    case "enforce":
      return "destructive";
    case "warn":
      return "default";
    case "shadow":
      return "secondary";
    default:
      return "outline";
  }
}

const Billing = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppSelector((s) => s.brokerAuth.user);
  const {
    config,
    access,
    usage,
    expenditure,
    quota,
    isLoadingUsage,
    error,
  } = useAppSelector((s) => s.billing);

  const isPlatformOwner = Boolean(user?.is_platform_owner);
  const paymentStatus = searchParams.get("payment");
  const scrollTopUp = searchParams.get("topup") === "1";
  const packFromUrl = searchParams.get("pack");
  const redirectPaymentIntent = searchParams.get("payment_intent");
  const redirectStatus = searchParams.get("redirect_status");

  const showInternalEconomics = showBillingInternalEconomics(config);

  const canAccessBilling = useMemo(
    () =>
      Boolean(
        config?.billingUiEnabled ||
        config?.stripeEnabled ||
        access?.blocksCostActions,
      ),
    [config, access],
  );

  const paymentAlertStatus = useMemo(
    () => getBillingPaymentStatus({ config, expenditure, quota }),
    [config, expenditure, quota],
  );

  const showUsageDashboard = Boolean(
    config?.billingUiEnabled || config?.stripeEnabled,
  );

  useEffect(() => {
    if (!isPlatformOwner) return;
    dispatch(fetchBillingConfig());
    dispatch(fetchTopUpOptions());
    dispatch(fetchBillingQuota());
    dispatch(fetchBillingPurchases());
    dispatch(fetchBillingAccess());
  }, [dispatch, isPlatformOwner]);

  useEffect(() => {
    if (!isPlatformOwner || !showUsageDashboard) return;
    dispatch(fetchBillingUsage());
  }, [dispatch, isPlatformOwner, showUsageDashboard]);

  useEffect(() => {
    if (!scrollTopUp) return;
    const el = document.getElementById("billing-topup");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollTopUp, config?.stripeEnabled]);

  useEffect(() => {
    if (!redirectPaymentIntent || redirectStatus !== "succeeded") return;
    dispatch(confirmStripePayment(redirectPaymentIntent)).finally(() => {
      setSearchParams({ topup: "1", payment: "success" }, { replace: true });
      if (showUsageDashboard) dispatch(fetchBillingUsage());
    });
  }, [
    redirectPaymentIntent,
    redirectStatus,
    dispatch,
    setSearchParams,
    showUsageDashboard,
  ]);

  useEffect(() => {
    if (paymentStatus === "success") {
      dispatch(fetchBillingQuota());
      dispatch(fetchBillingPurchases());
      if (showUsageDashboard) dispatch(fetchBillingUsage());
    }
  }, [paymentStatus, dispatch, showUsageDashboard]);

  if (!isPlatformOwner) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-4 sm:p-6 lg:p-8 text-center">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Platform owner access required</p>
        <Button variant="outline" onClick={() => navigate("/admin")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (config && !canAccessBilling) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-4 sm:p-6 lg:p-8 text-center">
        <CreditCard className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Billing is not available</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Billing is not enabled for your organization yet. Contact your
          platform administrator.
        </p>
        <Button variant="outline" onClick={() => navigate("/admin")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const plan = config?.plan;
  const voiceBilled = expenditure?.voiceMinutesBilled ?? 0;

  return (
    <>
      <MetaHelmet {...adminPageMeta("Billing", "Usage & platform fees")} />
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <PageHeader
          title="Billing & Usage"
          description="Unified quotas, 30-day expenditure, broadcast economics, and budget forecast"
          icon={<CreditCard className="h-7 w-7 text-primary" />}
          actions={
            showUsageDashboard ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isLoadingUsage}
                onClick={() => dispatch(fetchBillingUsage())}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4",
                    isLoadingUsage && "animate-spin",
                  )}
                />
                Refresh usage
              </Button>
            ) : null
          }
        />

        <BillingOverduePayCard />

        {paymentStatus === "success" ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
          >
            <Zap className="h-4 w-4 shrink-0" />
            Payment received — quota capacity has been added.
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => {
                dispatch(clearLastFulfillment());
                setSearchParams({}, { replace: true });
              }}
            >
              Dismiss
            </Button>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {sanitizeBillingError(error)}
          </div>
        ) : null}

        <BillingPaymentAlert
          status={paymentAlertStatus}
          stripeEnabled={config?.stripeEnabled}
        />

        <div className="flex flex-wrap items-center gap-2">
          {config ? (
            <>
              <Badge variant={modeBadgeVariant(config.billingQuotaMode)}>
                Billing: {formatQuotaModeLabel(config.billingQuotaMode)}
              </Badge>
              {config.billingQuotaMode === "off" ? (
                <span className="text-xs text-muted-foreground">
                  Usage limits are not enforced yet.
                </span>
              ) : null}
              {config.stripeTestMode ? (
                <Badge variant="outline" className="text-xs">
                  Sandbox
                </Badge>
              ) : null}
            </>
          ) : null}
          {access?.level && access.level !== "healthy" ? (
            access.level === "subscription_grace" ? (
              <BillingGraceCountdownBadge access={access} />
            ) : (
              <Badge
                variant={access.blocksCostActions ? "destructive" : "outline"}
                className="text-xs"
              >
                {formatBillingAccessLabel(access.level)}
              </Badge>
            )
          ) : null}
        </div>

        {showUsageDashboard && usage && expenditure && plan ? (
          <BillingExpendedPeriod
            usage={usage}
            expenditure={expenditure}
            plan={plan}
            quota={quota}
            showInternalEconomics={showInternalEconomics}
          />
        ) : showUsageDashboard && isLoadingUsage ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 py-12 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading expenditure snapshot…
          </div>
        ) : null}

        {quota ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live quota balances</CardTitle>
              <CardDescription>
                Unified pool — broadcast reserves reduce available SMS/email
                capacity
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-sm">
              {(
                [
                  ["SMS segments", quota.sms_segments],
                  ["Voice minutes", quota.voice_minutes],
                  ["Email sends", quota.email_sends],
                  ["Scheduler", quota.scheduler_bookings],
                ] as const
              ).map(([label, slice]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold tabular-nums">
                    {slice.used.toLocaleString()} /{" "}
                    {slice.included.toLocaleString()}
                  </p>
                  {slice.reserved > 0 ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      {slice.reserved.toLocaleString()} reserved
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    {slice.pct}% used
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card id="billing-subscription">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-primary" />
                  Platform subscription
                </CardTitle>
                <CardDescription>
                  {formatUsd(config?.platformFeeUsd ?? BILLING_PLAN_DEFAULTS.platformFeeUsd)}/month — unlocks
                  included monthly quotas
                </CardDescription>
              </div>
              {config?.stripeTestMode ? (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Test mode
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <StripePlatformSubscription hideHeader />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Add capacity
                </CardTitle>
                <CardDescription>
                  Secure card payment — live quota updates instantly. Broadcasts
                  use the SMS and email pools (see callout below).
                </CardDescription>
              </div>
              {config?.stripeTestMode ? (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Test mode
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <StripeTopUpCheckout
              hideHeader
              initialPackId={packFromUrl}
              recommendedPackId={paymentAlertStatus.suggestedPackId}
            />
          </CardContent>
        </Card>

        <BillingPurchaseHistory />

        {showUsageDashboard ? (
          <Tabs defaultValue="forecast" className="space-y-4">
            <TabsList>
              <TabsTrigger value="usage">Channel meters</TabsTrigger>
              <TabsTrigger value="forecast">Budget forecast</TabsTrigger>
            </TabsList>

            <TabsContent value="usage" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {usage && plan && expenditure ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                    >
                      <BillingUsageMeter
                        label="SMS segments"
                        used={usage.totalSmsSegments}
                        included={resolveQuotaIncluded(
                          quota,
                          "sms_segments",
                          plan.includedSmsSegments,
                        )}
                        pct={usagePctAgainstCapacity(
                          usage.totalSmsSegments,
                          resolveQuotaIncluded(
                            quota,
                            "sms_segments",
                            plan.includedSmsSegments,
                          ),
                        )}
                        tone="blue"
                        stacked={{
                          primaryLabel: "Conversational",
                          primaryValue: usage.convoSmsSegments,
                          secondaryLabel: "Broadcast",
                          secondaryValue: usage.broadcastSmsSegments,
                        }}
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <BillingUsageMeter
                        label="Voice minutes"
                        used={voiceBilled}
                        included={resolveQuotaIncluded(
                          quota,
                          "voice_minutes",
                          plan.includedVoiceMinutes,
                        )}
                        pct={usagePctAgainstCapacity(
                          voiceBilled,
                          resolveQuotaIncluded(
                            quota,
                            "voice_minutes",
                            plan.includedVoiceMinutes,
                          ),
                        )}
                        tone="blue"
                        detail={`${usage.voiceMinutesRecorded.toLocaleString()} min recorded · ${usage.callsLogged.toLocaleString()} calls · ~${(usage.voiceMinutesEstimated ?? 0).toLocaleString()} min estimated`}
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <BillingUsageMeter
                        label="Email sends"
                        used={usage.totalEmailSends}
                        included={resolveQuotaIncluded(
                          quota,
                          "email_sends",
                          plan.includedEmailSends,
                        )}
                        pct={usagePctAgainstCapacity(
                          usage.totalEmailSends,
                          resolveQuotaIncluded(
                            quota,
                            "email_sends",
                            plan.includedEmailSends,
                          ),
                        )}
                        tone="blue"
                        detail={
                          usage.broadcastEmailSends > 0
                            ? `${usage.broadcastEmailSends.toLocaleString()} from broadcasts`
                            : undefined
                        }
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <BillingUsageMeter
                        label="Scheduler bookings"
                        used={usage.schedulerBookings}
                        included={resolveQuotaIncluded(
                          quota,
                          "scheduler_bookings",
                          plan.includedSchedulerBookings,
                        )}
                        pct={usagePctAgainstCapacity(
                          usage.schedulerBookings,
                          resolveQuotaIncluded(
                            quota,
                            "scheduler_bookings",
                            plan.includedSchedulerBookings,
                          ),
                        )}
                        tone="blue"
                      />
                    </motion.div>
                  </>
                ) : (
                  <div className="col-span-full flex items-center justify-center py-16 text-muted-foreground">
                    <RefreshCw
                      className={cn(
                        "mr-2 h-5 w-5",
                        isLoadingUsage && "animate-spin",
                      )}
                    />
                    Loading usage…
                  </div>
                )}
              </div>

              {expenditure ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Megaphone className="h-4 w-4 text-amber-700" />
                        Broadcast economics
                      </CardTitle>
                      <CardDescription>
                        Highest variable cost — counts toward unified SMS/email
                        quota. Bulk campaigns use the same{" "}
                        <span className="font-medium">sms_segments</span> meter
                        and appear as{" "}
                        <span className="font-medium">Broadcast (Bulk)</span> —
                        not a separate cheaper unit.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Broadcast SMS segments
                        </span>
                        <span className="font-medium tabular-nums">
                          {expenditure.broadcast.smsSegments.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Includes standard and Bulk delivery engines. Monthly
                        platform fee is unchanged; only segment usage updates
                        Live quota.
                      </p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Share of SMS usage
                        </span>
                        <span className="font-medium tabular-nums">
                          {expenditure.broadcast.shareOfSmsPct}%
                        </span>
                      </div>
                      {showInternalEconomics ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Broadcast COGS
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatUsd(
                              expenditure.broadcast.cogsUsd +
                                expenditure.broadcast.emailCogsUsd,
                            )}
                          </span>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Owner spend (30-day window)
                      </CardTitle>
                      <CardDescription>
                        Platform fee + overage + typical add-ons
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Platform fee
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatUsd(expenditure.platformFeeUsd)}/mo
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Overage retail
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatUsd(expenditure.overageRetailUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Add-ons (est.)
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatUsd(expenditure.addonsUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
                        <span>Owner total</span>
                        <span className="tabular-nums">
                          {formatUsd(expenditure.ownerTotalUsd)}
                        </span>
                      </div>
                      {showInternalEconomics ? (
                        <>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Est. platform COGS</span>
                            <span className="tabular-nums">
                              {formatUsd(expenditure.totalPlatformCogsUsd)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Processing fees (est.)</span>
                            <span className="tabular-nums text-amber-700 dark:text-amber-400">
                              {formatUsd(expenditure.stripeFeesUsd ?? 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Net margin
                            </span>
                            <span
                              className={cn(
                                "tabular-nums font-medium",
                                expenditure.estimatedMarginUsd < 0
                                  ? "text-destructive"
                                  : "text-emerald-700 dark:text-emerald-400",
                              )}
                            >
                              {formatUsd(expenditure.estimatedMarginUsd)}
                            </span>
                          </div>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="forecast">
              <BillingBudgetForecast
                plan={plan}
                showInternalEconomics={showInternalEconomics}
              />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </>
  );
};

export default Billing;
