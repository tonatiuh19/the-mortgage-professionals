import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatBillingPeriodRange,
  formatIncludedQuotaRenewalLine,
  usesSubscriptionAnniversaryBilling,
} from "@/utils/billing-ui-copy";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearBillingError,
  clearLastFulfillment,
  clearSubscriptionSetup,
  confirmStripeSubscription,
  createStripeSubscriptionSetup,
  fetchBillingAccess,
  fetchBillingConfig,
  fetchBillingPurchases,
  fetchBillingQuota,
  fetchSavedPaymentMethod,
  resetStripeSubscriptionForTest,
} from "@/store/slices/billingSlice";
import { SavedPaymentMethodDisplay } from "@/components/billing/SavedPaymentMethodDisplay";
import { BillingConfigLoading } from "@/components/billing/BillingConfigLoading";
import { BILLING_PLAN_DEFAULTS } from "@shared/billing-calculator";
import {
  STRIPE_PAYMENT_ELEMENT_OPTIONS,
  stripeElementsLoaderOptions,
} from "@/utils/stripe-elements";
import {
  sanitizeBillingError,
  SECURE_PAYMENT_NOTE,
} from "@/utils/billing-ui-copy";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type SubscriptionPaymentFormProps = {
  subscriptionId: string;
  platformFeeUsd: number;
  onSuccess: (receipt?: {
    sent: boolean;
    skipped?: string;
    error?: string;
  }) => void;
  onError: (message: string) => void;
};

function SubscriptionPaymentForm({
  subscriptionId,
  platformFeeUsd,
  onSuccess,
  onError,
}: SubscriptionPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useAppDispatch();
  const [isPaying, setIsPaying] = useState(false);
  const [ready, setReady] = useState(false);

  const syncAfterPayment = useCallback(async () => {
    const result = await dispatch(
      confirmStripeSubscription(subscriptionId),
    ).unwrap();
    await Promise.all([
      dispatch(fetchBillingConfig()).unwrap(),
      dispatch(fetchSavedPaymentMethod()).unwrap(),
      dispatch(fetchBillingQuota()).unwrap(),
      dispatch(fetchBillingAccess()).unwrap(),
    ]);
    return result.receipt_email;
  }, [dispatch, subscriptionId]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsPaying(true);
    dispatch(clearBillingError());

    try {
      const returnUrl = `${window.location.origin}/admin/billing?subscription=success`;
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Payment failed");
        return;
      }

      const piOk =
        !paymentIntent ||
        paymentIntent.status === "succeeded" ||
        paymentIntent.status === "processing" ||
        paymentIntent.status === "requires_capture";

      if (!piOk) {
        onError(
          `Payment not completed (status: ${paymentIntent?.status ?? "unknown"})`,
        );
        return;
      }

      await syncAfterPayment().then((receipt) => onSuccess(receipt));
    } catch (err: unknown) {
      onError(
        err instanceof Error
          ? err.message
          : "Subscription payment received but sync failed",
      );
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubscribe} className="space-y-5">
      <div className="flex items-baseline justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Due today</p>
          <p className="text-xs text-muted-foreground">Renews monthly · cancel anytime in billing</p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {formatUsd(platformFeeUsd)}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>
      </div>
      <div
        className={cn(
          "rounded-lg border border-border/80 bg-background p-4 transition-opacity",
          ready ? "opacity-100" : "opacity-60",
        )}
      >
        <PaymentElement
          onReady={() => setReady(true)}
          options={STRIPE_PAYMENT_ELEMENT_OPTIONS}
        />
      </div>
      <Button
        type="submit"
        className="gap-2"
        disabled={!stripe || !elements || !ready || isPaying}
      >
        {isPaying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Subscribe · {formatUsd(platformFeeUsd)}/mo
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Your card is saved automatically for monthly renewals and top-up
        purchases.
      </p>
    </form>
  );
}

function IncludedQuotasGrid({
  quotas,
  caption,
}: {
  quotas: readonly (readonly [string, number])[];
  caption?: string;
}) {
  if (!quotas.length) return null;
  return (
    <div className="space-y-2">
      {caption ? (
        <p className="text-xs text-muted-foreground">{caption}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {quotas.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-semibold tabular-nums">
              {value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = {
  hideHeader?: boolean;
};

export function StripePlatformSubscription({ hideHeader = false }: Props) {
  const dispatch = useAppDispatch();
  const {
    config,
    savedPaymentMethod,
    subscriptionSetup,
    isSubscriptionSetupLoading,
    isConfirmingSubscription,
    isLoadingConfig,
    error,
    overdue,
  } = useAppSelector((s) => s.billing);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [justSubscribed, setJustSubscribed] = useState(false);
  const [suppressAutoSubscribe, setSuppressAutoSubscribe] = useState(false);
  const autoSetupAttempted = useRef(false);
  // Once an overdue renewal has been seen here, never auto-start a checkout:
  // when it clears (paid) the page may not yet know the subscription is active
  // again, and an automatic setup would open a second subscription.
  const sawOverdue = useRef(false);
  if (overdue) sawOverdue.current = true;

  const publishableKey = config?.stripePublishableKey ?? null;
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  const platformFee =
    config?.platformFeeUsd ?? BILLING_PLAN_DEFAULTS.platformFeeUsd;
  const plan = config?.plan;
  const subscriptionConfigured =
    config?.stripePlatformSubscriptionConfigured ?? false;
  const stripeSubscriptionActive = config?.stripeSubscriptionActive ?? false;
  const subscriptionComplete = stripeSubscriptionActive || justSubscribed;
  // The local row stores trials as "active", so ask Stripe's status.
  const isTrialing = config?.stripeSubscriptionStatus === "trialing";

  const includedQuotas = useMemo(
    () =>
      plan
        ? ([
            ["SMS segments", plan.includedSmsSegments],
            ["Voice minutes", plan.includedVoiceMinutes],
            ["Email sends", plan.includedEmailSends],
            ["Scheduler", plan.includedSchedulerBookings],
          ] as const)
        : [],
    [plan],
  );

  const startSetup = useCallback(
    (forceNew = false) => {
      setLocalError(null);
      setLocalNotice(null);
      setSuppressAutoSubscribe(false);
      if (forceNew) {
        dispatch(clearSubscriptionSetup());
      }
      if (forceNew) {
        autoSetupAttempted.current = true;
      }
      dispatch(createStripeSubscriptionSetup(forceNew));
    },
    [dispatch],
  );

  const handleTestReset = useCallback(async () => {
    setLocalError(null);
    setLocalNotice(null);
    setJustSubscribed(false);
    setSuppressAutoSubscribe(true);
    try {
      const result = await dispatch(resetStripeSubscriptionForTest()).unwrap();
      setLocalNotice(result.message);
      dispatch(clearSubscriptionSetup());
      dispatch(clearLastFulfillment());
      await Promise.all([
        dispatch(fetchBillingConfig()).unwrap(),
        dispatch(fetchBillingAccess()).unwrap(),
        dispatch(fetchBillingQuota()).unwrap(),
        dispatch(fetchBillingPurchases()).unwrap(),
      ]);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Failed to reset test subscription",
      );
    }
  }, [dispatch]);

  useEffect(() => {
    if (config?.stripeEnabled && config.stripeCustomerId) {
      dispatch(fetchSavedPaymentMethod());
    }
  }, [dispatch, config?.stripeEnabled, config?.stripeCustomerId]);

  useEffect(() => {
    if (
      config?.stripeEnabled &&
      subscriptionConfigured &&
      !subscriptionComplete &&
      !subscriptionSetup &&
      !isSubscriptionSetupLoading &&
      !suppressAutoSubscribe &&
      !overdue &&
      !sawOverdue.current &&
      !autoSetupAttempted.current
    ) {
      autoSetupAttempted.current = true;
      startSetup(false);
    }
  }, [
    config?.stripeEnabled,
    subscriptionConfigured,
    subscriptionComplete,
    subscriptionSetup,
    isSubscriptionSetupLoading,
    suppressAutoSubscribe,
    overdue,
    startSetup,
  ]);

  if (isLoadingConfig || !config) {
    return <BillingConfigLoading label="Loading subscription…" />;
  }

  if (!config.stripeEnabled) {
    return null;
  }

  if (!subscriptionConfigured) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-6 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          Platform subscription not configured
        </p>
        <p className="mt-2">
          Subscription pricing is not configured yet. Contact support to
          complete setup.
        </p>
      </div>
    );
  }

  if (subscriptionComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-5 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">
                  {isTrialing ? "Free trial active" : "Subscription active"}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {config?.subscription?.status ??
                    config?.stripeSubscriptionStatus ??
                    "active"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatUsd(platformFee)}/month
                {usesSubscriptionAnniversaryBilling(
                  config?.billingPeriodAnchor,
                ) && config?.quotaRenewsOn ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-medium text-foreground">
                      {formatIncludedQuotaRenewalLine(config.quotaRenewsOn)}
                    </span>
                  </>
                ) : (
                  <> · included quotas renew each billing period</>
                )}
              </p>
              {isTrialing && config?.subscription?.periodEnd ? (
                <p className="text-sm font-medium text-foreground">
                  Free until {config.subscription.periodEnd}. Add a card before then to keep your plan at{" "}
                  {formatUsd(platformFee)}/month.
                </p>
              ) : null}
              {config?.subscription?.periodStart ? (
                <p className="text-xs text-muted-foreground">
                  Current period{" "}
                  {formatBillingPeriodRange(
                    config.subscription.periodStart,
                    config.subscription.periodEnd,
                  )}
                </p>
              ) : null}
            </div>
          </div>
          <SavedPaymentMethodDisplay allowUpdate />
        </div>

        {config?.stripeTestMode ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Test mode — reset to run subscribe + confirmation email again.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={isSubscriptionSetupLoading}
              onClick={handleTestReset}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset for testing
            </Button>
          </div>
        ) : null}

        <IncludedQuotasGrid
          quotas={includedQuotas}
          caption={`Included monthly with your ${formatUsd(platformFee)} plan (baseline — top-ups add capacity in Active billing period below).`}
        />
      </motion.div>
    );
  }

  const clientSecret = subscriptionSetup?.clientSecret ?? null;
  const subscriptionId = subscriptionSetup?.subscriptionId ?? "";

  return (
    <div className="space-y-6">
      {!hideHeader ? (
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold">Platform subscription</h3>
          <p className="text-sm text-muted-foreground">
            {formatUsd(platformFee)}/month — unlocks included monthly quotas
          </p>
        </div>
      ) : null}

      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Complete subscription payment
          </p>
          <p className="text-sm text-muted-foreground">
            Enter your card once — it&apos;s saved for {formatUsd(platformFee)}
            /mo renewals and top-up purchases.
          </p>
        </div>
      </div>

      <IncludedQuotasGrid
        quotas={includedQuotas}
        caption="These are the monthly plan baselines — not your live usage or purchased top-ups."
      />

      {(localError || error) && (
        <p role="alert" className="text-sm text-destructive">
          {sanitizeBillingError(localError || error)}
        </p>
      )}

      {localNotice ? (
        <p
          role="status"
          className="text-sm text-emerald-700 dark:text-emerald-400"
        >
          {localNotice}
        </p>
      ) : null}

      {overdue && !subscriptionComplete ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-6 py-10 text-center">
          <p className="text-sm font-medium text-destructive">
            Your last renewal is unpaid.
          </p>
          <p className="text-sm text-muted-foreground">
            Pay the overdue invoice at the top of this page to keep your
            subscription — no new subscription is needed.
          </p>
        </div>
      ) : suppressAutoSubscribe &&
        !subscriptionSetup &&
        !isSubscriptionSetupLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/80 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Test reset complete. Start a fresh subscription checkout when
            you&apos;re ready.
          </p>
          <Button type="button" onClick={() => startSetup(false)}>
            Start subscription checkout
          </Button>
        </div>
      ) : isSubscriptionSetupLoading ||
        isConfirmingSubscription ||
        !stripePromise ||
        !clientSecret ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 px-6 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isConfirmingSubscription
            ? "Activating subscription…"
            : "Preparing card form…"}
        </div>
      ) : (
        <Elements
          key={clientSecret}
          stripe={stripePromise}
          options={stripeElementsLoaderOptions(clientSecret)}
        >
          <SubscriptionPaymentForm
            subscriptionId={subscriptionId}
            platformFeeUsd={platformFee}
            onSuccess={(receipt) => {
              setJustSubscribed(true);
              if (receipt?.sent) {
                setLocalNotice(
                  "Subscription active — confirmation email sent to your inbox.",
                );
              } else if (receipt?.skipped === "already_sent") {
                setLocalNotice(
                  "Subscription active — confirmation email was already sent for this invoice.",
                );
              } else if (
                receipt?.error ||
                receipt?.skipped === "no_recipient"
              ) {
                setLocalNotice(
                  "Subscription active — we couldn't send the confirmation email right now. Your subscription is still active.",
                );
              }
            }}
            onError={setLocalError}
          />
        </Elements>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          {SECURE_PAYMENT_NOTE}
        </p>
        {!isSubscriptionSetupLoading &&
        !isConfirmingSubscription &&
        (localError || error || config?.stripeTestMode) ? (
          <div className="flex flex-wrap items-center gap-2">
            {config?.stripeTestMode ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleTestReset}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset for testing
              </Button>
            ) : null}
            {localError || error ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => startSetup(true)}
              >
                Retry setup
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
