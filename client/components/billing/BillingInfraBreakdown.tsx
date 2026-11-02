import type { BillingFixedInfraBreakdown } from "@shared/api";
import { cn } from "@/lib/utils";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const LINE_LABELS: Record<keyof BillingFixedInfraBreakdown, string> = {
  vercelUsd: "Vercel (hosting + API)",
  ablyUsd: "Ably (real-time)",
  tidbUsd: "TiDB Cloud",
  resendUsd: "Resend (outbound email)",
  cdnHostgatorImapUsd: "CDN + Hostgator IMAP",
  tenDlcAmortizedUsd: "US 10DLC (amortized)",
  zoomApiLicenseUsd: "Zoom API license",
};

type Props = {
  breakdown: BillingFixedInfraBreakdown;
  totalUsd: number;
  zoomBrokerCogsUsd?: number;
  className?: string;
};

export function BillingInfraBreakdown({
  breakdown,
  totalUsd,
  zoomBrokerCogsUsd = 0,
  className,
}: Props) {
  const entries = Object.entries(breakdown) as [keyof BillingFixedInfraBreakdown, number][];

  return (
    <div className={cn("space-y-2 text-xs", className)}>
      <p className="font-medium text-foreground">Fixed infra COGS — {formatUsd(totalUsd)}/mo</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <li key={key} className="flex justify-between gap-2 text-muted-foreground">
            <span>{LINE_LABELS[key]}</span>
            <span className="tabular-nums shrink-0">{formatUsd(value)}</span>
          </li>
        ))}
        {zoomBrokerCogsUsd > 0 ? (
          <li className="flex justify-between gap-2 text-muted-foreground sm:col-span-2">
            <span>Zoom broker seats (pass-through COGS)</span>
            <span className="tabular-nums shrink-0">{formatUsd(zoomBrokerCogsUsd)}</span>
          </li>
        ) : null}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Excludes variable SMS/voice usage, card processing (~2.9% + $0.30/charge), and
        Office 365 (tenant-provided).
      </p>
    </div>
  );
}
