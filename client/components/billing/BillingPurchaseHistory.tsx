import { CalendarRange, CheckCircle2, History, Receipt } from "lucide-react";
import type { BillingCapacityPurchase } from "@shared/api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

function formatUsd(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PurchaseRow({ purchase }: { purchase: BillingCapacityPurchase }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Receipt className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-medium">{purchase.label}</p>
          {purchase.activeForCurrentPeriod ? (
            <Badge className="gap-1 bg-emerald-600/90 text-[10px] hover:bg-emerald-600/90">
              <CheckCircle2 className="h-3 w-3" />
              Active this period
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Prior period
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          +{purchase.units.toLocaleString()} · {formatDate(purchase.createdAt)}
          {purchase.appliedPeriodStart
            ? ` · applied to ${purchase.appliedPeriodStart}`
            : null}
        </p>
      </div>
      <p className="text-sm font-semibold tabular-nums shrink-0">
        {formatUsd(purchase.amountCents)}
      </p>
    </div>
  );
}

export function BillingPurchaseHistory({ className }: { className?: string }) {
  const { activePeriod, purchases, isLoadingPurchases } = useAppSelector(
    (s) => s.billing,
  );

  if (isLoadingPurchases && !activePeriod) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!activePeriod) return null;

  const periodLabel = activePeriod.periodEnd
    ? `${activePeriod.periodStart} → ${activePeriod.periodEnd}`
    : `Started ${activePeriod.periodStart}`;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-primary" />
          Active billing period
        </CardTitle>
        <CardDescription>
          {periodLabel}
          {activePeriod.subscriptionStatus
            ? ` · Subscription ${activePeriod.subscriptionStatus.replace(/_/g, " ")}`
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium text-right">Plan</th>
                <th className="px-3 py-2 font-medium text-right">Top-ups</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
                <th className="px-3 py-2 font-medium text-right">Used</th>
              </tr>
            </thead>
            <tbody>
              {activePeriod.capacities.map((row) => (
                <tr
                  key={row.dimension}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-3 py-2.5 font-medium">{row.title}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.planIncluded.toLocaleString()}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right tabular-nums",
                      row.topUpIncluded > 0
                        ? "font-medium text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {row.topUpIncluded > 0
                      ? `+${row.topUpIncluded.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                    {row.totalIncluded.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {row.used.toLocaleString()}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({row.pct}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Capacity purchases</p>
          </div>
          {purchases.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              No top-ups yet — purchased capacity will appear here with period
              status.
            </p>
          ) : (
            <div className="space-y-2">
              {purchases.map((purchase) => (
                <PurchaseRow key={purchase.id} purchase={purchase} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
