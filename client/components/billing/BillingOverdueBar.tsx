import { motion } from "framer-motion";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatDaysOverdue,
  formatOverdueAmount,
} from "@/hooks/useBillingOverdue";
import type { BillingOverdueInvoice } from "@shared/api";

/**
 * Permanent, non-dismissible "payment overdue" banner for the platform owner.
 * Same visual language as BillingAccessBanner (rounded-xl, destructive tint,
 * icon tile), but sticky inside the admin <main> scroll area. <main>'s pt-14
 * already clears the fixed mobile header, so top-0 sits right under it.
 */
export function BillingOverdueBar({
  overdue,
}: {
  overdue: BillingOverdueInvoice;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const onBillingPage = location.pathname.startsWith("/admin/billing");
  const amount = formatOverdueAmount(overdue);

  const goPay = () => {
    if (onBillingPage) {
      document
        .getElementById("billing-overdue")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate("/admin/billing#billing-overdue");
  };

  return (
    <div className="sticky top-0 z-30 bg-background/80 px-4 pt-3 backdrop-blur-md md:px-6 md:pt-4">
      <motion.div
        role="alert"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 280, damping: 26 }}
        className="relative overflow-hidden rounded-xl border border-destructive/40 bg-card shadow-sm"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-destructive/15 via-destructive/5 to-transparent" />
        <div className="pointer-events-none absolute -left-6 -top-10 h-24 w-24 rounded-full bg-destructive/15 blur-2xl" />

        <div className="relative flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 min-[400px]:flex text-destructive dark:text-red-400 sm:h-10 sm:w-10">
            <span className="absolute inset-0 animate-ping rounded-xl bg-destructive/20" />
            <AlertTriangle className="relative h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="whitespace-nowrap font-semibold text-destructive dark:text-red-400">
                Payment overdue
              </p>
              <Badge
                variant="outline"
                className="gap-1 whitespace-nowrap border-destructive/35 bg-destructive/10 dark:border-red-500/40 dark:bg-red-500/10 text-xs font-semibold tabular-nums text-destructive dark:text-red-400"
              >
                <Clock className="h-3 w-3" />
                {overdue.days_overdue <= 0
                  ? "today"
                  : formatDaysOverdue(overdue)}
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {amount} renewal unpaid
              <span className="hidden md:inline">
                {" "}
                — outbound SMS, email, calls and AI will pause until it's paid
              </span>
            </p>
          </div>

          <Button size="sm" onClick={goPay} className="shrink-0 gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Pay<span className="hidden min-[400px]:inline"> now</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default BillingOverdueBar;
