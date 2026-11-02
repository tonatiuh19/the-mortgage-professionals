import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Clock, CreditCard, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  formatDaysOverdue,
  formatOverdueAmount,
} from "@/hooks/useBillingOverdue";
import { SECURE_PAYMENT_NOTE } from "@/utils/billing-ui-copy";
import type { BillingOverdueInvoice } from "@shared/api";

const LOCK_SECONDS = 10;

const PAUSES = [
  "Outbound SMS, MMS & WhatsApp",
  "Outbound email and broadcasts",
  "Outbound calls, Mortgi AI and scheduler bookings",
];

/**
 * Mobile-only reminder for the platform owner while a renewal is unpaid.
 * Same look as BillingSuspendedWall. Re-opens on every page change (and app
 * open); "Remind me later" unlocks after a 10s countdown. Never shown on the
 * Billing page itself.
 */
export function BillingOverdueInterstitial({
  overdue,
}: {
  overdue: BillingOverdueInvoice;
}) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const onBillingPage = location.pathname.startsWith("/admin/billing");
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(LOCK_SECONDS);
  const dialogRef = useRef<HTMLDivElement>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);

  // Every navigation (including first load) re-opens it.
  useEffect(() => {
    if (!isMobile || onBillingPage) {
      setOpen(false);
      return;
    }
    setSecondsLeft(LOCK_SECONDS);
    setOpen(true);
  }, [isMobile, onBillingPage, location.pathname]);

  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [open, secondsLeft]);

  const locked = secondsLeft > 0;

  // Lock background scroll, focus the primary action, trap Tab, and allow
  // Escape only once the countdown has finished.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    payButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!locked) setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href]",
        ),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, locked]);

  const amount = formatOverdueAmount(overdue);
  const progress = ((LOCK_SECONDS - secondsLeft) / LOCK_SECONDS) * 100;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="billing-overdue-interstitial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-end justify-center bg-background/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:items-center"
        >
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="billing-overdue-title"
            aria-describedby="billing-overdue-desc"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-destructive/15 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 text-destructive dark:text-red-400"
              >
                <AlertTriangle className="h-8 w-8" />
              </motion.div>

              <h2
                id="billing-overdue-title"
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                Payment overdue
              </h2>
              <p className="mt-2 text-4xl font-extrabold tabular-nums text-destructive dark:text-red-400">
                {amount}
              </p>
              <Badge
                variant="outline"
                className="mt-2 gap-1 border-destructive/35 bg-destructive/10 dark:border-red-500/40 dark:bg-red-500/10 text-xs font-semibold tabular-nums text-destructive dark:text-red-400"
              >
                <Clock className="h-3 w-3" />
                {overdue.days_overdue <= 0
                  ? "Renewal failed today"
                  : `Unpaid for ${formatDaysOverdue(overdue)}`}
                {overdue.number ? ` · ${overdue.number}` : ""}
              </Badge>
              <p
                id="billing-overdue-desc"
                className="mt-3 max-w-md text-sm text-muted-foreground"
              >
                Your platform renewal didn&apos;t go through. These
                pause until it&apos;s paid:
              </p>

              <ul className="mt-3 w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-left text-sm text-muted-foreground">
                {PAUSES.map((item) => (
                  <li key={item} className="flex items-start gap-2 py-1">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex w-full flex-col gap-2">
                <Button
                  ref={payButtonRef}
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    setOpen(false);
                    navigate("/admin/billing#billing-overdue");
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  Pay {amount} now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  disabled={locked}
                  onClick={() => setOpen(false)}
                  className="relative overflow-hidden disabled:opacity-100 disabled:text-muted-foreground"
                >
                  {locked ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-muted transition-[width] duration-1000 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  ) : null}
                  <span className="relative tabular-nums">
                    {locked
                      ? `Remind me later (${secondsLeft}s)`
                      : "Remind me later"}
                  </span>
                </Button>
              </div>

              <p className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {SECURE_PAYMENT_NOTE}
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default BillingOverdueInterstitial;
