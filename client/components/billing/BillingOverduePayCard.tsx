import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangeCardForm } from "@/components/billing/SavedPaymentMethodDisplay";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createStripePaymentMethodSetup,
  fetchBillingAccess,
  fetchBillingConfig,
  fetchBillingOverdue,
  fetchOverduePaymentOptions,
  fetchSavedPaymentMethod,
  payOverdueInvoice,
} from "@/store/slices/billingSlice";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { SECURE_PAYMENT_NOTE } from "@/utils/billing-ui-copy";
import { stripeElementsLoaderOptions } from "@/utils/stripe-elements";
import {
  formatDaysOverdue,
  formatOverdueAmount,
  useBillingOverdueValue,
} from "@/hooks/useBillingOverdue";
import type { BillingOverduePaymentCard } from "@shared/api";

const dateLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

const brandName = (brand: string) =>
  brand === "amex"
    ? "Amex"
    : brand === "mastercard"
      ? "Mastercard"
      : brand.charAt(0).toUpperCase() + brand.slice(1);

/**
 * Billing page: pay the unpaid renewal invoice without leaving the app.
 * Pick a saved card (unusable ones are disabled with the reason) or add a
 * new one (existing SetupIntent form), then charge the overdue invoice.
 * 3-D Secure, when the bank asks for it, completes in place via Stripe.js.
 * Renders nothing when no invoice is overdue.
 */
export function BillingOverduePayCard() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const overdue = useBillingOverdueValue();
  const {
    config,
    overdueCards,
    isLoadingOverdueCards,
    isPayingOverdue,
    paymentMethodSetup,
    isPaymentMethodSetupLoading,
  } = useAppSelector((s) => s.billing);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingCard, setAddingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paidAmount, setPaidAmount] = useState<string | null>(null);

  const publishableKey = config?.stripePublishableKey ?? null;
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  const overdueInvoiceId = overdue?.invoice_id ?? null;

  // Load cards whenever there's an overdue invoice to pay.
  useEffect(() => {
    if (overdueInvoiceId) dispatch(fetchOverduePaymentOptions());
  }, [dispatch, overdueInvoiceId]);

  // Default selection: first usable card (list is usable-first, default-first).
  useEffect(() => {
    const stillValid = overdueCards.some(
      (c) => c.id === selectedId && c.usable,
    );
    if (!stillValid) {
      setSelectedId(overdueCards.find((c) => c.usable)?.id ?? null);
    }
  }, [overdueCards, selectedId]);

  // Arriving from the banner/interstitial (#billing-overdue): bring it into view.
  useEffect(() => {
    if (overdue && window.location.hash === "#billing-overdue") {
      document
        .getElementById("billing-overdue")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [overdue]);

  const refreshAfterPayment = () => {
    dispatch(fetchBillingOverdue(true));
    dispatch(fetchBillingAccess());
    dispatch(fetchBillingConfig());
    dispatch(fetchSavedPaymentMethod());
  };

  if (paidAmount) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        <Card className="relative overflow-hidden border-emerald-500/30">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-emerald-500/[0.03] to-transparent" />
          <CardContent className="relative flex items-center gap-3 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                Payment received — {paidAmount}
              </p>
              <p className="text-sm text-muted-foreground">
                Thank you. Your subscription is current and this card will be
                used for future renewals.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!overdue) return null;

  const amount = formatOverdueAmount(overdue);
  const failedOn = dateLabel(overdue.failed_at);
  const nextRetry = dateLabel(overdue.next_payment_attempt);
  const selected = overdueCards.find((c) => c.id === selectedId) ?? null;
  const usableCount = overdueCards.filter((c) => c.usable).length;
  const busy = isPayingOverdue || verifying;

  const startAddCard = () => {
    setCardError(null);
    setAddingCard(true);
    dispatch(createStripePaymentMethodSetup());
  };

  const pay = async () => {
    if (!selected || !overdue) return;
    setPayError(null);
    const request = {
      invoice_id: overdue.invoice_id,
      payment_method_id: selected.id,
    };
    try {
      let result = await dispatch(payOverdueInvoice(request)).unwrap();
      if (!result.paid && result.requiresAction) {
        const stripe = stripePromise ? await stripePromise : null;
        if (!stripe) throw new Error("Card verification is unavailable.");
        setVerifying(true);
        const { error } = await stripe.handleNextAction({
          clientSecret: result.clientSecret,
        });
        setVerifying(false);
        if (error) {
          throw new Error(error.message ?? "Card verification failed.");
        }
        // Verified — the server confirms it's paid and saves the card.
        result = await dispatch(payOverdueInvoice(request)).unwrap();
      }
      if (!result.paid) throw new Error("The payment didn't go through.");
      setPaidAmount(amount);
      toast({
        title: "Payment received",
        description: `${amount} paid with ${brandName(selected.brand)} •••• ${selected.last4}.`,
      });
      refreshAfterPayment();
    } catch (err) {
      setVerifying(false);
      const message =
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "The payment didn't go through.";
      logger.error("Overdue payment failed:", err);
      setPayError(message);
      // Card list may have changed (e.g. a newly declined card).
      dispatch(fetchOverduePaymentOptions());
    }
  };

  return (
    <motion.div
      id="billing-overdue"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="scroll-mt-40 md:scroll-mt-28"
    >
      <Card className="relative overflow-hidden border-destructive/40 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-destructive/10 via-destructive/[0.03] to-transparent" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-destructive/15 blur-3xl" />

        <CardHeader className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-base text-destructive dark:text-red-400">
                  Platform renewal unpaid
                </CardTitle>
                <CardDescription>
                  {failedOn
                    ? `Your monthly renewal failed on ${failedOn}.`
                    : "Your monthly renewal failed."}{" "}
                  Outbound SMS, email, calls and AI features pause until it's
                  paid. Inbound messages, your data and the client portal keep
                  working.
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 gap-1 border-destructive/35 bg-destructive/10 text-xs font-semibold tabular-nums text-destructive dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
            >
              <Clock className="h-3 w-3" />
              {overdue.days_overdue <= 0
                ? "Failed today"
                : `Overdue ${formatDaysOverdue(overdue)}`}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* Summary */}
            <div className="space-y-3">
              <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {amount}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  due now
                </span>
              </p>
              <dl className="flex flex-wrap gap-2 text-xs">
                {overdue.number ? (
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
                    <dt className="text-muted-foreground">Invoice</dt>
                    <dd className="font-mono font-medium text-foreground">
                      {overdue.number}
                    </dd>
                  </div>
                ) : null}
                <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
                  <dt className="text-muted-foreground">Failed attempts</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {overdue.attempt_count}
                  </dd>
                </div>
                {nextRetry ? (
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <CalendarClock className="h-3 w-3" />
                      Next auto-retry
                    </dt>
                    <dd className="font-medium text-foreground">{nextRetry}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {/* Pay in-app */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Pay with</p>

              {isLoadingOverdueCards && overdueCards.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your cards…
                </div>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Card to pay with"
                  className="space-y-2"
                >
                  {overdueCards.map((card) => (
                    <CardOption
                      key={card.id}
                      card={card}
                      selected={card.id === selectedId}
                      disabled={busy}
                      onSelect={() => {
                        setPayError(null);
                        setSelectedId(card.id);
                        setAddingCard(false);
                      }}
                    />
                  ))}
                </div>
              )}

              <AnimatePresence initial={false}>
                {addingCard ? (
                  <motion.div
                    key="add-card"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-border/70 bg-card p-4">
                      <p className="mb-1 text-sm font-medium">Add a new card</p>
                      <p className="text-xs text-muted-foreground">
                        Visa or Mastercard. It becomes your card for future
                        renewals.
                      </p>
                      {cardError ? (
                        <p
                          role="alert"
                          className="mt-2 text-sm text-destructive dark:text-red-400"
                        >
                          {cardError}
                        </p>
                      ) : null}
                      {isPaymentMethodSetupLoading ||
                      !stripePromise ||
                      !paymentMethodSetup?.clientSecret ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Preparing secure card form…
                        </div>
                      ) : (
                        <Elements
                          key={paymentMethodSetup.clientSecret}
                          stripe={stripePromise}
                          options={stripeElementsLoaderOptions(
                            paymentMethodSetup.clientSecret,
                          )}
                        >
                          <ChangeCardForm
                            setupIntentId={paymentMethodSetup.setupIntentId}
                            submitLabel="Save card"
                            onCancel={() => {
                              setAddingCard(false);
                              setCardError(null);
                            }}
                            onSuccess={async () => {
                              setAddingCard(false);
                              setCardError(null);
                              try {
                                const res = await dispatch(
                                  fetchOverduePaymentOptions(),
                                ).unwrap();
                                // The saved card is now the default — select it.
                                const added = res.cards.find(
                                  (c) => c.usable && c.is_default,
                                );
                                if (added) setSelectedId(added.id);
                              } catch (err) {
                                logger.error("Reload cards failed:", err);
                              }
                            }}
                            onError={setCardError}
                          />
                        </Elements>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {!addingCard ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startAddCard}
                  disabled={busy || isPaymentMethodSetupLoading}
                  className="w-full gap-1.5 border-dashed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {usableCount === 0 ? "Add a card to pay" : "Use a new card"}
                </Button>
              ) : null}

              {payError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:text-red-400"
                >
                  {payError}
                </p>
              ) : null}

              <Button
                size="lg"
                onClick={() => void pay()}
                disabled={!selected || busy || addingCard}
                className="h-auto min-h-11 w-full gap-2 whitespace-normal py-2.5"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 shrink-0" />
                )}
                {verifying
                  ? "Verifying with your bank…"
                  : isPayingOverdue
                    ? "Processing payment…"
                    : selected
                      ? `Pay ${amount} with ${brandName(selected.brand)} •••• ${selected.last4}`
                      : `Pay ${amount}`}
              </Button>
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {SECURE_PAYMENT_NOTE}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CardOption({
  card,
  selected,
  disabled,
  onSelect,
}: {
  card: BillingOverduePaymentCard;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const unusable = !card.usable;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={unusable || disabled}
      disabled={unusable || disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/40"
          : "border-border/70 bg-card hover:bg-muted/40",
        unusable &&
          "cursor-not-allowed bg-muted/30 opacity-70 hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-muted-foreground/40",
        )}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <CreditCard className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          {brandName(card.brand)} •••• {card.last4}
          {card.wallet === "apple_pay" ? (
            <span className="text-xs font-normal text-muted-foreground">
              (Apple Pay)
            </span>
          ) : null}
          {card.is_default && card.usable ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              Default
            </Badge>
          ) : null}
        </span>
        <span
          className={cn(
            "block text-xs",
            unusable
              ? "text-destructive dark:text-red-400"
              : "text-muted-foreground",
          )}
        >
          {unusable
            ? card.unusable_reason
            : `Expires ${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`}
        </span>
      </span>
      {selected && !unusable ? (
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
      ) : null}
    </button>
  );
}

export default BillingOverduePayCard;
