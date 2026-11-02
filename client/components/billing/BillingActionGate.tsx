import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import { billingTopUpPath } from "@shared/billing-access";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  /** When true, replaces children with an inline gate message */
  blockWhenRestricted?: boolean;
  className?: string;
  fallbackMessage?: string;
};

const BLOCKED_KEYS = new Set(["Enter", " ", "NumpadEnter"]);

function blockGateKeyboard(event: KeyboardEvent) {
  if (!BLOCKED_KEYS.has(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Wraps cost-generating actions (send, broadcast, etc.) and blocks interaction
 * when subscription is restricted, quota is exhausted, billing status is
 * loading, or billing status could not be verified (fail-closed).
 */
export function BillingActionGate({
  children,
  blockWhenRestricted = true,
  className,
  fallbackMessage,
}: Props) {
  const {
    access,
    teamNotice,
    stripeEnabled,
    isPlatformOwner,
    isActionGateLocked,
    actionGateReason,
  } = useBillingAccess();

  if (!blockWhenRestricted || !isActionGateLocked) {
    return <>{children}</>;
  }

  const isLoading = actionGateReason === "loading";
  const isError = actionGateReason === "error";

  const headline = isLoading
    ? "Checking billing status"
    : isError
      ? "Billing status unavailable"
      : isPlatformOwner
        ? (access?.headline ?? "Action unavailable")
        : (teamNotice?.headline ?? "Action unavailable");

  const message =
    fallbackMessage ??
    (isLoading
      ? "Verifying whether outbound actions are allowed. This usually takes a moment."
      : isError
        ? "We could not confirm your billing status. Outbound actions stay paused until access can be verified."
        : isPlatformOwner
          ? (access?.detail ?? "This action is paused until billing is resolved.")
          : (teamNotice?.detail ??
            "Outbound sends are paused. Contact your platform owner."));

  const Icon = isLoading ? Loader2 : ShieldAlert;

  return (
    <div
      className={cn(
        "relative rounded-xl border border-destructive/25 bg-destructive/5 p-4",
        isLoading && "border-muted-foreground/20 bg-muted/30",
        className,
      )}
      aria-busy={isLoading}
    >
      <fieldset
        disabled
        className="min-w-0 border-0 p-0 m-0 opacity-40"
        onKeyDownCapture={blockGateKeyboard}
        onKeyUpCapture={blockGateKeyboard}
        aria-hidden
      >
        {children}
      </fieldset>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/75 p-4 backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isLoading
              ? "bg-muted text-muted-foreground"
              : "bg-destructive/15 text-destructive",
          )}
        >
          <Icon className={cn("h-5 w-5", isLoading && "animate-spin")} />
        </div>
        <p className="max-w-sm text-center text-sm font-medium text-foreground">
          {headline}
        </p>
        <p className="max-w-sm text-center text-xs text-muted-foreground">{message}</p>
        {!isLoading && !isError && isPlatformOwner && stripeEnabled && access?.suggestedPackId ? (
          <Button asChild size="sm" variant="outline">
            <Link to={billingTopUpPath(access.suggestedPackId)}>Add capacity</Link>
          </Button>
        ) : !isLoading && !isError && isPlatformOwner ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/billing">View billing</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
