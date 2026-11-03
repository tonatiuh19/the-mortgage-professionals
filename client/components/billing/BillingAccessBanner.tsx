import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import { formatGraceCountdown, billingTopUpPath } from "@shared/billing-access";
import type { BillingAccessLevel } from "@shared/billing-access";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  className?: string;
  /** Hide subscription-state notices (grace/restricted) — the overdue bar
   *  already covers an unpaid renewal. Quota notices still show. */
  suppressSubscriptionNotices?: boolean;
};

const LEVEL_STYLES: Record<
  BillingAccessLevel,
  { border: string; bg: string; text: string; Icon: typeof AlertTriangle }
> = {
  healthy: {
    border: "border-border",
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    Icon: AlertTriangle,
  },
  soft_warn: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  subscription_grace: {
    border: "border-amber-500/35",
    bg: "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent",
    text: "text-amber-800 dark:text-amber-300",
    Icon: Clock,
  },
  quota_blocked: {
    border: "border-destructive/35",
    bg: "bg-destructive/10",
    text: "text-destructive",
    Icon: AlertCircle,
  },
  subscription_restricted: {
    border: "border-destructive/35",
    bg: "bg-destructive/10",
    text: "text-destructive",
    Icon: ShieldAlert,
  },
  subscription_suspended: {
    border: "border-destructive/50",
    bg: "bg-destructive/15",
    text: "text-destructive",
    Icon: ShieldAlert,
  },
};

function useGraceCountdown(initialSeconds: number | null): number | null {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds == null || seconds <= 0) return;
    const id = window.setInterval(() => {
      setSeconds((prev) => (prev != null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  return seconds;
}

export function BillingAccessBanner({
  className,
  suppressSubscriptionNotices = false,
}: Props) {
  const { access, showWarnBanner, stripeEnabled, isPlatformOwner, config } =
    useBillingAccess();

  const graceSeconds = useGraceCountdown(
    access?.level === "subscription_grace"
      ? (access.secondsUntilGraceEnd ?? null)
      : null,
  );

  if (!isPlatformOwner || !access || !showWarnBanner) return null;
  if (access.level === "healthy") return null;
  if (config?.billingUiEnabled === false) return null;
  if (
    suppressSubscriptionNotices &&
    (access.level === "subscription_grace" ||
      access.level === "subscription_restricted")
  ) {
    return null;
  }

  const styles = LEVEL_STYLES[access.level];
  const Icon = styles.Icon;
  const countdown = formatGraceCountdown(graceSeconds);
  const isOnboardingGrace =
    access.level === "subscription_grace" && access.graceKind === "onboarding";
  const isPaymentGrace =
    access.level === "subscription_grace" &&
    access.graceKind === "payment_past_due";
  const topUpHref = billingTopUpPath(access.suggestedPackId);
  const billingHref = isOnboardingGrace
    ? "/admin/billing#billing-subscription"
    : "/admin/billing";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 280, damping: 26 }}
      role="alert"
      className={cn(
        "relative mb-3 overflow-hidden rounded-xl border px-4 py-4 sm:px-5",
        isOnboardingGrace
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/12 via-primary/5 to-transparent"
          : styles.border,
        !isOnboardingGrace && styles.bg,
        className,
      )}
    >
      {isOnboardingGrace ? (
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/15 blur-2xl" />
      ) : null}
      {access.level === "subscription_grace" ? (
        <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
      ) : null}

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isOnboardingGrace
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : access.level === "subscription_grace"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  : cn("bg-background/60", styles.text),
            )}
          >
            {isOnboardingGrace ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "font-semibold",
                  isOnboardingGrace
                    ? "text-emerald-800 dark:text-emerald-200"
                    : styles.text,
                )}
              >
                {access.headline}
              </p>
              {access.level === "subscription_grace" && countdown ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-1 tabular-nums text-xs font-semibold",
                    isOnboardingGrace
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                      : "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200",
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {countdown}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{access.detail}</p>
            {access.level === "subscription_grace" ? (
              <p className="text-xs text-muted-foreground">
                {isOnboardingGrace
                  ? "3-day onboarding grace · full access until it ends"
                  : isPaymentGrace
                    ? "3-day payment grace · renew before restrictions apply"
                    : "Grace period active"}
                {config?.billingQuotaMode === "off"
                  ? " · quota enforcement is still off"
                  : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {stripeEnabled &&
          (access.level === "quota_blocked" ||
            access.level === "subscription_restricted") ? (
            <Button asChild size="sm" variant="default" className="gap-1.5">
              <Link to={topUpHref}>
                <CreditCard className="h-3.5 w-3.5" />
                {access.level === "quota_blocked" ? "Add capacity" : "Resolve billing"}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant={isOnboardingGrace ? "default" : "outline"}>
              <Link to={billingHref}>
                {access.level === "subscription_grace"
                  ? isOnboardingGrace
                    ? "Subscribe now"
                    : "Update payment"
                  : "Open billing"}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function BillingGraceCountdownBadge({
  access,
  className,
}: {
  access: import("@shared/billing-access").BillingAccessState;
  className?: string;
}) {
  const graceSeconds = useGraceCountdown(
    access.level === "subscription_grace"
      ? (access.secondsUntilGraceEnd ?? null)
      : null,
  );
  const countdown = formatGraceCountdown(graceSeconds);
  if (access.level !== "subscription_grace" || !countdown) return null;

  const isOnboarding = access.graceKind === "onboarding";

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 tabular-nums text-xs",
        isOnboarding
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      Grace · {countdown}
    </Badge>
  );
}
