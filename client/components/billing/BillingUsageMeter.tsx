import { cn } from "@/lib/utils";

export type BillingMeterTone = "blue" | "orange" | "purple" | "red";

type Props = {
  label: string;
  used: number;
  included: number;
  pct: number;
  tone?: BillingMeterTone;
  sublabel?: string;
  detail?: string;
  stacked?: {
    primaryLabel: string;
    primaryValue: number;
    secondaryLabel: string;
    secondaryValue: number;
  };
  formatValue?: (n: number) => string;
  className?: string;
};

const toneBar: Record<BillingMeterTone, string> = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
};

const toneTrack: Record<BillingMeterTone, string> = {
  blue: "bg-blue-500/20",
  orange: "bg-orange-500/20",
  purple: "bg-purple-500/20",
  red: "bg-red-500/20",
};

function defaultFormat(n: number): string {
  return n.toLocaleString();
}

function barTone(pct: number, base: BillingMeterTone): BillingMeterTone {
  if (pct >= 100) return "red";
  if (pct >= 80 && base !== "purple") return "orange";
  return base;
}

export function BillingUsageMeter({
  label,
  used,
  included,
  pct,
  tone = "blue",
  sublabel,
  detail,
  stacked,
  formatValue = defaultFormat,
  className,
}: Props) {
  const activeTone = barTone(pct, tone);
  const clampedPct = Math.min(100, Math.max(0, pct));

  const stackedTotal = stacked
    ? stacked.primaryValue + stacked.secondaryValue
    : 0;
  const primaryPct =
    stacked && stackedTotal > 0
      ? (stacked.primaryValue / stackedTotal) * clampedPct
      : clampedPct;
  const secondaryPct = stacked && stackedTotal > 0 ? clampedPct - primaryPct : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/50 p-4 shadow-sm transition-colors",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sublabel ? (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatValue(used)}
            <span className="font-normal text-muted-foreground">
              {" "}
              / {formatValue(included)}
            </span>
          </p>
          <p
            className={cn(
              "text-xs font-medium tabular-nums",
              pct >= 100
                ? "text-red-600"
                : pct >= 80
                  ? "text-orange-600"
                  : "text-muted-foreground",
            )}
          >
            {pct}% used
          </p>
        </div>
      </div>

      <div
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full",
          toneTrack[activeTone],
        )}
        role="progressbar"
        aria-valuenow={clampedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} usage`}
      >
        {stacked ? (
          <div className="flex h-full w-full">
            <div
              className={cn("h-full transition-all duration-500", toneBar.blue)}
              style={{ width: `${primaryPct}%` }}
            />
            <div
              className={cn("h-full transition-all duration-500", toneBar.orange)}
              style={{ width: `${secondaryPct}%` }}
            />
          </div>
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              toneBar[activeTone],
            )}
            style={{ width: `${clampedPct}%` }}
          />
        )}
      </div>

      {stacked ? (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {stacked.primaryLabel}: {formatValue(stacked.primaryValue)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            {stacked.secondaryLabel}: {formatValue(stacked.secondaryValue)}
          </span>
        </div>
      ) : null}

      {detail ? (
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}
