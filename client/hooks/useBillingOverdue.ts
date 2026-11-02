import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBillingOverdue } from "@/store/slices/billingSlice";
import type { BillingOverdueInvoice } from "@shared/api";

const POLL_MS = 5 * 60 * 1000;

/**
 * Unpaid platform renewal (read from Stripe). Call once with `enabled` from
 * AdminLayout (platform owner only) — it loads on mount, every 5 minutes and
 * whenever the tab regains focus so the badge clears soon after payment.
 * Other components read `state.billing.overdue` via `useBillingOverdueValue`.
 */
export function useBillingOverdue(enabled: boolean): BillingOverdueInvoice | null {
  const dispatch = useAppDispatch();
  const overdue = useAppSelector((s) => s.billing.overdue);

  useEffect(() => {
    if (!enabled) return;
    dispatch(fetchBillingOverdue());
    const interval = window.setInterval(
      () => dispatch(fetchBillingOverdue()),
      POLL_MS,
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        dispatch(fetchBillingOverdue());
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dispatch, enabled]);

  return enabled ? overdue : null;
}

/** Read-only access for components that don't own the polling. */
export function useBillingOverdueValue(): BillingOverdueInvoice | null {
  const isPlatformOwner = useAppSelector(
    (s) => s.brokerAuth.user?.role === "admin",
  );
  const overdue = useAppSelector((s) => s.billing.overdue);
  return isPlatformOwner ? overdue : null;
}

export function formatOverdueAmount(overdue: BillingOverdueInvoice): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (overdue.currency || "usd").toUpperCase(),
  }).format(overdue.amount_due_usd);
}

/** "today", "1 day", "7 days" — how long the renewal has been unpaid. */
export function formatDaysOverdue(overdue: BillingOverdueInvoice): string {
  const d = overdue.days_overdue;
  if (d <= 0) return "today";
  return d === 1 ? "1 day" : `${d} days`;
}
