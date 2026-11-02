import React, { useCallback, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CreditCard, Loader2, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BillingSavedPaymentMethod } from "@shared/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearBillingError,
  confirmStripePaymentMethod,
  createStripePaymentMethodSetup,
  fetchBillingConfig,
  fetchSavedPaymentMethod,
} from "@/store/slices/billingSlice";
import {
  STRIPE_PAYMENT_ELEMENT_OPTIONS,
  stripeElementsLoaderOptions,
} from "@/utils/stripe-elements";

function formatBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatExpiry(pm: BillingSavedPaymentMethod): string {
  const month = String(pm.expMonth).padStart(2, "0");
  const year = String(pm.expYear).slice(-2);
  return `${month}/${year}`;
}

type ChangeFormProps = {
  setupIntentId: string;
  onCancel: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
  /** Defaults to "Save new card". */
  submitLabel?: string;
};

/** Saves a card via SetupIntent (Payment Element) and makes it the default. */
export function ChangeCardForm({
  setupIntentId,
  onCancel,
  onSuccess,
  onError,
  submitLabel = "Save new card",
}: ChangeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useAppDispatch();
  const [isSaving, setIsSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSaving(true);
    dispatch(clearBillingError());

    const returnUrl = `${window.location.origin}/admin/billing?payment_method=updated`;
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    setIsSaving(false);

    if (error) {
      onError(error.message ?? "Failed to save card");
      return;
    }

    const siId = setupIntent?.id ?? setupIntentId;
    try {
      await dispatch(confirmStripePaymentMethod(siId)).unwrap();
      dispatch(fetchBillingConfig());
      onSuccess();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to apply payment method");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 pt-2">
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
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="gap-2" disabled={!stripe || !elements || !ready || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

type Props = {
  /** Show a change-card control (active subscription only) */
  allowUpdate?: boolean;
  className?: string;
};

/** Read-only saved card — used after subscribe/top-up; no duplicate checkout forms. */
export function SavedPaymentMethodDisplay({ allowUpdate = false, className }: Props) {
  const dispatch = useAppDispatch();
  const {
    config,
    savedPaymentMethod,
    paymentMethodSetup,
    isPaymentMethodLoading,
    isPaymentMethodSetupLoading,
    error,
  } = useAppSelector((s) => s.billing);
  const [isChanging, setIsChanging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const publishableKey = config?.stripePublishableKey ?? null;
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  const startChange = useCallback(() => {
    setLocalError(null);
    setIsChanging(true);
    dispatch(createStripePaymentMethodSetup());
  }, [dispatch]);

  if (!config?.stripeEnabled || !config.stripeCustomerId) {
    return null;
  }

  const clientSecret = paymentMethodSetup?.clientSecret ?? null;
  const setupIntentId = paymentMethodSetup?.setupIntentId ?? "";

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <CreditCard className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Payment method</p>
          {isPaymentMethodLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : savedPaymentMethod ? (
            <p className="text-sm text-muted-foreground truncate">
              {formatBrand(savedPaymentMethod.brand)} •••• {savedPaymentMethod.last4}
              <span className="mx-1.5 text-border">·</span>
              Expires {formatExpiry(savedPaymentMethod)}
              <span className="mx-1.5 text-border">·</span>
              Used for renewals &amp; top-ups
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Saved automatically when you complete subscription payment
            </p>
          )}
        </div>
      </div>

      {allowUpdate && savedPaymentMethod && !isChanging ? (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 shrink-0 text-xs"
          disabled={isPaymentMethodSetupLoading}
          onClick={startChange}
        >
          <Pencil className="h-3.5 w-3.5" />
          Change card
        </Button>
      ) : null}

      {isChanging ? (
        <div className="w-full sm:col-span-2">
          {(localError || error) ? (
            <p role="alert" className="mb-2 text-sm text-destructive">
              {localError || error}
            </p>
          ) : null}
          {isPaymentMethodSetupLoading || !stripePromise || !clientSecret ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing card form…
            </div>
          ) : (
            <Elements stripe={stripePromise} options={stripeElementsLoaderOptions(clientSecret)}>
              <ChangeCardForm
                setupIntentId={setupIntentId}
                onCancel={() => {
                  setIsChanging(false);
                  setLocalError(null);
                }}
                onSuccess={() => {
                  setIsChanging(false);
                  setLocalError(null);
                  dispatch(fetchSavedPaymentMethod());
                }}
                onError={setLocalError}
              />
            </Elements>
          )}
        </div>
      ) : null}
    </div>
  );
}
