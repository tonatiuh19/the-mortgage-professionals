import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageSquare,
  Mic,
  Mail,
  CalendarDays,
  Bot,
  ShieldCheck,
  Terminal,
  Sparkles,
  AlertCircle,
  Megaphone,
} from "lucide-react";
import type { BillingSavedPaymentMethod, UsageDimension } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  chargeTopUpQuote,
  clearBillingError,
  fetchBillingAccess,
  fetchBillingQuota,
  fetchBillingPurchases,
  fetchBillingUsage,
  fetchSavedPaymentMethod,
  fetchTopUpOptions,
} from "@/store/slices/billingSlice";
import { BillingConfigLoading } from "@/components/billing/BillingConfigLoading";
import { showBillingInternalEconomics } from "@/utils/billing-internal";
import { sanitizeBillingError } from "@/utils/billing-ui-copy";
import {
  quotaPctForDimension,
  resolveInitialTopUpSelection,
  suggestTierIndexForQuota,
  TOP_UP_DIMENSION_ORDER,
} from "@/utils/billing-top-up-ui";

const DIMENSION_ICONS: Record<UsageDimension, React.ReactNode> = {
  sms_segments: <MessageSquare className="h-5 w-5" />,
  voice_minutes: <Mic className="h-5 w-5" />,
  email_sends: <Mail className="h-5 w-5" />,
  scheduler_bookings: <CalendarDays className="h-5 w-5" />,
  mortgi_ai_tokens: <Bot className="h-5 w-5" />,
};

const DIMENSION_ACCENT: Record<UsageDimension, string> = {
  sms_segments: "from-primary/20 to-primary/5 border-primary/30",
  voice_minutes: "from-primary/20 to-primary/5 border-primary/30",
  email_sends: "from-primary/20 to-primary/5 border-primary/30",
  scheduler_bookings: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
  mortgi_ai_tokens: "from-primary/20 to-primary/5 border-primary/30",
};

function formatPackPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function StripeDevHint() {
  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium text-primary dark:text-primary">
        <Terminal className="h-4 w-4" />
        Local dev — webhook optional
      </div>
      <p className="text-muted-foreground">
        Top-ups charge your saved card instantly. For production parity, also forward webhooks:
      </p>
      <code className="mt-2 block overflow-x-auto rounded-lg bg-muted/80 px-3 py-2 text-xs">
        stripe listen --forward-to localhost:8080/api/billing/stripe/webhook
      </code>
    </div>
  );
}

type Props = {
  id?: string;
  className?: string;
  hideHeader?: boolean;
  initialPackId?: string | null;
  recommendedPackId?: string | null;
};

export function StripeTopUpCheckout({
  id = "billing-topup",
  className,
  hideHeader = false,
  initialPackId,
  recommendedPackId,
}: Props) {
  const dispatch = useAppDispatch();
  const {
    config,
    quota,
    expenditure,
    topUpOptions,
    isLoadingTopUpOptions,
    isLoadingConfig,
    savedPaymentMethod,
    isPaymentMethodLoading,
    isConfirmingPayment,
    lastFulfillment,
    error,
  } = useAppSelector((s) => s.billing);

  const [dimension, setDimension] = useState<UsageDimension>("sms_segments");
  const [tierIndex, setTierIndex] = useState(0);
  const [phase, setPhase] = useState<"select" | "fulfilling" | "success">("select");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const didInitSelection = useRef(false);

  const hasSavedCard = Boolean(config?.hasPaymentMethod || savedPaymentMethod);
  const showInternalEconomics = showBillingInternalEconomics(config);

  const channel = useMemo(
    () => topUpOptions.find((c) => c.dimension === dimension) ?? null,
    [topUpOptions, dimension],
  );

  const tier = channel?.tiers[tierIndex] ?? null;
  const usagePct = quotaPctForDimension(dimension, quota);

  useEffect(() => {
    if (config?.stripeEnabled) {
      dispatch(fetchSavedPaymentMethod());
      dispatch(fetchTopUpOptions());
    }
  }, [dispatch, config?.stripeEnabled]);

  useEffect(() => {
    if (didInitSelection.current || topUpOptions.length === 0) return;
    const packHint = initialPackId ?? recommendedPackId;
    if (!packHint && !quota) return;

    const selection = resolveInitialTopUpSelection({
      topUpOptions,
      initialPackId,
      recommendedPackId,
      quota,
    });
    setDimension(selection.dimension);
    setTierIndex(selection.tierIndex);
    didInitSelection.current = true;
  }, [topUpOptions, initialPackId, recommendedPackId, quota]);

  useEffect(() => {
    if (lastFulfillment?.granted) setPhase("success");
  }, [lastFulfillment]);

  const handleDimensionChange = useCallback(
    (value: string) => {
      const next = value as UsageDimension;
      setDimension(next);
      const nextChannel = topUpOptions.find((c) => c.dimension === next);
      if (nextChannel && quota) {
        setTierIndex(suggestTierIndexForQuota(nextChannel, quota));
      } else {
        setTierIndex(0);
      }
    },
    [topUpOptions, quota],
  );

  const handleChargeSavedCard = useCallback(async () => {
    if (!channel || tier == null) return;
    setConfirmOpen(false);
    setFormError(null);
    dispatch(clearBillingError());
    setPhase("fulfilling");
    try {
      await dispatch(
        chargeTopUpQuote({ dimension: channel.dimension, tierIndex }),
      ).unwrap();
      await Promise.all([
        dispatch(fetchBillingQuota()).unwrap(),
        dispatch(fetchBillingPurchases()).unwrap(),
        dispatch(fetchBillingUsage()).unwrap(),
        dispatch(fetchBillingAccess()).unwrap(),
      ]);
      setPhase("success");
    } catch (err: unknown) {
      setPhase("select");
      setFormError(err instanceof Error ? err.message : "Payment failed");
    }
  }, [dispatch, channel, tier, tierIndex]);

  const fulfilledDimensionPct = useMemo(() => {
    if (!lastFulfillment || !quota) return null;
    return quotaPctForDimension(
      lastFulfillment.dimension as UsageDimension,
      quota,
    );
  }, [lastFulfillment, quota]);

  const cardLabel = useMemo(() => {
    const pm: BillingSavedPaymentMethod | null = savedPaymentMethod;
    if (!pm) return "saved card";
    return `${formatBrand(pm.brand)} •••• ${pm.last4}`;
  }, [savedPaymentMethod]);

  if (isLoadingConfig || !config) {
    return (
      <BillingConfigLoading
        id={id}
        className={className}
        label="Loading top-up options…"
      />
    );
  }

  if (!config.stripeEnabled) {
    return null;
  }

  return (
    <div id={id} className={cn("space-y-6", className)}>
      {!hideHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-5 w-5 text-primary" />
              Add capacity
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose a channel, slide to your amount, pay with your saved card
            </p>
          </div>
          {config.stripeTestMode ? (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Test mode
            </Badge>
          ) : null}
        </div>
      ) : null}

      {import.meta.env.DEV &&
      config.stripeTestMode &&
      !config.stripeWebhookConfigured ? (
        <StripeDevHint />
      ) : null}

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Megaphone className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Broadcasting — unified quota
          </p>
          <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-700">
            No separate top-up
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Realtor broadcasts draw from the same SMS and email pools as conversational
          messaging. Add capacity on the SMS or Email tabs below — not a separate
          broadcast pack.
        </p>
        {expenditure?.broadcast ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Last 30 days:{" "}
              <strong className="text-foreground tabular-nums">
                {expenditure.broadcast.smsSegments.toLocaleString()}
              </strong>{" "}
              broadcast SMS ·{" "}
              <strong className="text-foreground tabular-nums">
                {expenditure.broadcast.emailSends.toLocaleString()}
              </strong>{" "}
              broadcast emails
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-500/30"
              onClick={() => handleDimensionChange("sms_segments")}
            >
              Top up SMS
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-500/30"
              onClick={() => handleDimensionChange("email_sends")}
            >
              Top up email
            </Button>
          </div>
        ) : null}
      </div>

      {!hasSavedCard && !isPaymentMethodLoading ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Save a card first</p>
            <p className="text-sm text-muted-foreground">
              Complete the platform subscription above — your card is saved automatically and used
              for all top-up purchases.
            </p>
          </div>
        </div>
      ) : null}

      {isLoadingTopUpOptions ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading capacity options…
        </div>
      ) : channel && tier ? (
        <div className="space-y-5">
          <Tabs value={dimension} onValueChange={handleDimensionChange}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
              {TOP_UP_DIMENSION_ORDER.map((dim) => {
                const meta = topUpOptions.find((c) => c.dimension === dim);
                if (!meta) return null;
                const pct = quotaPctForDimension(dim, quota);
                return (
                  <TabsTrigger
                    key={dim}
                    value={dim}
                    className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-sm"
                  >
                    {DIMENSION_ICONS[dim]}
                    {meta.title}
                    {pct != null && pct >= 80 ? (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        {pct}%
                      </span>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <motion.div
            key={`${dimension}-${tierIndex}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl border bg-gradient-to-br p-5 sm:p-6",
              DIMENSION_ACCENT[dimension],
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{channel.title} capacity</p>
                <motion.p
                  key={tier.units}
                  initial={{ opacity: 0.6, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl"
                >
                  +{tier.units.toLocaleString()}
                </motion.p>
                <p className="text-sm text-muted-foreground">{channel.unitLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold tabular-nums text-primary">
                  {formatPackPrice(tier.amountCents)}
                </p>
                {usagePct != null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current usage {usagePct}% of included
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Slider
                value={[tierIndex]}
                min={0}
                max={Math.max(0, channel.tiers.length - 1)}
                step={1}
                disabled={!hasSavedCard || phase === "fulfilling"}
                onValueChange={(values) => setTierIndex(values[0] ?? 0)}
                className="py-2"
              />
              <div className="flex flex-wrap gap-2">
                {channel.tiers.map((t, idx) => (
                  <button
                    key={t.tierId}
                    type="button"
                    disabled={!hasSavedCard || phase === "fulfilling"}
                    onClick={() => setTierIndex(idx)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      idx === tierIndex
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/70 bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {t.chipLabel} · {formatPackPrice(t.amountCents)}
                  </button>
                ))}
              </div>
            </div>

            {showInternalEconomics && tier.economics ? (
              <p className="mt-4 text-[11px] text-muted-foreground">
                Internal: net ~{formatUsd(tier.economics.netMarginUsd)} (
                {tier.economics.marginPct}% after COGS + processing)
              </p>
            ) : null}
          </motion.div>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {phase === "success" && lastFulfillment ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-10 text-center px-4"
          >
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <div>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                +{lastFulfillment.units.toLocaleString()} added
              </p>
              <p className="text-sm text-muted-foreground">{lastFulfillment.packLabel}</p>
              {fulfilledDimensionPct != null ? (
                <p className="mt-2 text-xs text-emerald-700/90 dark:text-emerald-400/90">
                  Live quota updated — now {fulfilledDimensionPct}% of included used.
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                Expended usage above reflects sends in the current billing period and does not
                change when you add capacity. Quota balances and meters refresh
                automatically.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPhase("select")}>
              Add more capacity
            </Button>
          </motion.div>
        ) : phase === "fulfilling" || isConfirmingPayment ? (
          <motion.div
            key="fulfilling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-muted/20 py-12"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">Charging {cardLabel}…</p>
            <p className="text-sm text-muted-foreground">Applying quota — usually takes a second</p>
          </motion.div>
        ) : hasSavedCard && tier ? (
          <motion.div
            key={`${dimension}-${tier.tierId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/60 bg-muted/10 px-5 py-5"
          >
            <div>
              <p className="text-sm font-medium">{tier.label}</p>
              <p className="text-sm text-muted-foreground">
                Pay {formatPackPrice(tier.amountCents)} with {cardLabel}
              </p>
            </div>
            <Button
              className="gap-2 shrink-0"
              size="lg"
              onClick={() => setConfirmOpen(true)}
              disabled={isConfirmingPayment}
            >
              <ShieldCheck className="h-4 w-4" />
              Add capacity · {formatPackPrice(tier.amountCents)}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm capacity purchase</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You are about to charge{" "}
                  <strong className="text-foreground">{cardLabel}</strong> for:
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-foreground">
                  <p className="font-semibold">{tier?.label}</p>
                  <p className="text-lg font-bold tabular-nums text-primary mt-1">
                    {tier ? formatPackPrice(tier.amountCents) : "—"}
                  </p>
                  {usagePct != null ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current usage: {usagePct}% of included → capacity increases
                      immediately after payment.
                    </p>
                  ) : null}
                </div>
                <p className="text-xs">
                  This purchase is non-refundable. Quota applies to your current billing
                  period.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isConfirmingPayment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gap-2"
              disabled={isConfirmingPayment}
              onClick={(e) => {
                e.preventDefault();
                void handleChargeSavedCard();
              }}
            >
              {isConfirmingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Confirm · {tier ? formatPackPrice(tier.amountCents) : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {sanitizeBillingError(formError)}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {sanitizeBillingError(error)}
        </p>
      ) : null}
    </div>
  );
}
