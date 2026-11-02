import { motion } from "framer-motion";
import { CreditCard, Lock, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import { billingTopUpPath } from "@shared/billing-access";
import { Button } from "@/components/ui/button";
import { SECURE_PAYMENT_NOTE } from "@/utils/billing-ui-copy";

const BILLING_PATH_PREFIX = "/admin/billing";

export function BillingSuspendedWall() {
  const location = useLocation();
  const { access, showsFullWall, stripeEnabled, isPlatformOwner } = useBillingAccess();
  const onBillingPage = location.pathname.startsWith(BILLING_PATH_PREFIX);

  if (!isPlatformOwner || !showsFullWall || !access || onBillingPage) {
    return null;
  }

  const isOnboarding = access.graceKind === "onboarding";
  const billingHref = isOnboarding
    ? "/admin/billing#billing-subscription"
    : billingTopUpPath(access.suggestedPackId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-suspended-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-destructive/30 bg-card p-8 shadow-2xl"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-destructive/15 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <Lock className="h-8 w-8" />
          </div>
          <h2
            id="billing-suspended-title"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {access.headline}
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{access.detail}</p>

          {access.whatStillWorks.length > 0 ? (
            <ul className="mt-5 w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-left text-sm text-muted-foreground">
              {access.whatStillWorks.map((item) => (
                <li key={item} className="flex items-start gap-2 py-1">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {stripeEnabled ? (
              <Button asChild size="lg" className="gap-2">
                <Link to={billingHref}>
                  <CreditCard className="h-4 w-4" />
                  {isOnboarding ? "Subscribe & restore access" : "Update payment"}
                </Link>
              </Button>
            ) : null}
            <Button asChild size="lg" variant={stripeEnabled ? "outline" : "default"}>
              <Link to="/admin/billing">Billing & usage</Link>
            </Button>
          </div>

          {stripeEnabled ? (
            <p className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              {SECURE_PAYMENT_NOTE}
            </p>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
