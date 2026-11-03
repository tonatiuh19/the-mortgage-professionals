import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CreditCard, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  billingTopUpHref,
  formatBillingPaymentAlertCopy,
  type BillingPaymentStatus,
} from "@/utils/billing-payment-status";
import { SECURE_PAYMENT_NOTE } from "@/utils/billing-ui-copy";

type Props = {
  status: BillingPaymentStatus;
  stripeEnabled?: boolean;
  variant?: "banner" | "card";
  className?: string;
};

export function BillingPaymentAlert({
  status,
  stripeEnabled = false,
  variant = "card",
  className,
}: Props) {
  if (!status.shouldWarn && !status.paymentRequired) return null;

  const blocked = status.paymentRequired;
  const alertCopy = formatBillingPaymentAlertCopy(status);
  const Icon = blocked ? AlertCircle : AlertTriangle;
  const body = alertCopy.body;

  if (variant === "banner") {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm",
          blocked
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          className,
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{body}</span>
        {stripeEnabled ? (
          <Link
            to={billingTopUpHref(status.suggestedPackId)}
            className="font-semibold underline underline-offset-2"
          >
            Pay now
          </Link>
        ) : (
          <Link to="/admin/billing" className="font-medium underline underline-offset-2">
            Billing
          </Link>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 shadow-sm",
        blocked
          ? "border-destructive/40 bg-gradient-to-br from-destructive/10 via-card to-card"
          : "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl",
          blocked ? "bg-destructive/20" : "bg-amber-500/20",
        )}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              blocked ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {alertCopy.title}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
            {stripeEnabled ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {SECURE_PAYMENT_NOTE}
              </p>
            ) : null}
          </div>
        </div>
        {stripeEnabled ? (
          <Button
            asChild
            size="sm"
            variant={blocked ? "default" : "outline"}
            className="shrink-0 gap-2"
          >
            <Link to={billingTopUpHref(status.suggestedPackId)}>
              <CreditCard className="h-4 w-4" />
              {blocked ? "Add capacity" : status.quotaAtCap ? "Add capacity" : "Top up now"}
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to="/admin/billing">View usage</Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
