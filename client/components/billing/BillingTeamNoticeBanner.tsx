import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBillingTeamNotice } from "@/store/slices/billingSlice";
import {
  formatGraceCountdown,
  type BillingTeamNoticeLevel,
} from "@shared/billing-access";
import { cn } from "@/lib/utils";

type Props = { className?: string };

const LEVEL_STYLES: Record<
  BillingTeamNoticeLevel,
  { border: string; bg: string; text: string; Icon: typeof AlertTriangle }
> = {
  soft_warn: {
    border: "border-amber-500/35",
    bg: "bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-transparent",
    text: "text-amber-700 dark:text-amber-300",
    Icon: AlertTriangle,
  },
  subscription_grace: {
    border: "border-amber-500/35",
    bg: "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent",
    text: "text-amber-800 dark:text-amber-300",
    Icon: Clock,
  },
  subscription_restricted: {
    border: "border-destructive/35",
    bg: "bg-destructive/10",
    text: "text-destructive",
    Icon: ShieldAlert,
  },
  subscription_suspended: {
    border: "border-destructive/45",
    bg: "bg-destructive/12",
    text: "text-destructive",
    Icon: ShieldAlert,
  },
  quota_blocked: {
    border: "border-amber-500/35",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    Icon: AlertCircle,
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

export function BillingTeamNoticeBanner({ className }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.brokerAuth.user);
  const teamNotice = useAppSelector((s) => s.billing.teamNotice);
  const isPlatformOwner = Boolean(user?.is_platform_owner);

  useEffect(() => {
    if (!user || isPlatformOwner) return;
    dispatch(fetchBillingTeamNotice());
    const interval = window.setInterval(() => {
      dispatch(fetchBillingTeamNotice());
    }, 120_000);
    return () => window.clearInterval(interval);
  }, [dispatch, user, isPlatformOwner]);

  const graceSeconds = useGraceCountdown(
    teamNotice?.level === "subscription_grace"
      ? (teamNotice.secondsUntilGraceEnd ?? null)
      : null,
  );

  if (isPlatformOwner || !teamNotice?.show || !teamNotice.level) return null;

  const styles = LEVEL_STYLES[teamNotice.level];
  const Icon = styles.Icon;
  const countdown =
    teamNotice.level === "subscription_grace"
      ? formatGraceCountdown(graceSeconds)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      role="alert"
      className={cn(
        "mb-3 flex items-start gap-3 rounded-xl border px-4 py-3",
        styles.border,
        styles.bg,
        className,
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/60",
          styles.text,
          teamNotice.level === "subscription_grace" && "bg-amber-500/20",
          teamNotice.level === "soft_warn" && "bg-amber-500/20",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold", styles.text)}>{teamNotice.headline}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{teamNotice.detail}</p>
        {teamNotice.level === "soft_warn" ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Your administrator may need to add capacity soon — sends are not blocked yet.
          </p>
        ) : null}
        {countdown ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Full access may pause in {countdown}
          </p>
        ) : null}
        {teamNotice.blocksOutbound ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            Contact your platform owner or administrator
          </p>
        ) : (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            No action needed on your account — your administrator handles billing
          </p>
        )}
      </div>
    </motion.div>
  );
}
