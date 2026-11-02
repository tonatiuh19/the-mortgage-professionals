import { cn } from "@/lib/utils";

/** Pulsing red dot for avatars / nav triggers while a payment is overdue.
 *  Parent must be `relative`. */
export function BillingOverdueDot({ className }: { className?: string }) {
  return (
    <span
      aria-label="Payment overdue"
      role="status"
      className={cn(
        "pointer-events-none absolute -right-0.5 -top-0.5 flex h-3 w-3",
        className,
      )}
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive ring-2 ring-background" />
    </span>
  );
}

export default BillingOverdueDot;
