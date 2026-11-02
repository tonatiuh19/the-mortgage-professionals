/**
 * Pure formatters for calculator → loan notes snapshots.
 * Keep in sync with the inlined copy in api/index.ts (Vercel serverless).
 */

export type CalculatorSaveKind =
  | "fha"
  | "va"
  | "conventional"
  | "investment"
  | "mobile_home"
  | "income";

export function calculatorKindLabel(kind: CalculatorSaveKind | string): string {
  switch (kind) {
    case "fha":
      return "FHA";
    case "va":
      return "VA";
    case "conventional":
      return "Conventional";
    case "investment":
      return "Investment Property";
    case "mobile_home":
      return "Mobile Home";
    case "income":
      return "Wage Earner Income";
    default:
      return String(kind);
  }
}

function money(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

function pct(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(3)}%`;
}

/**
 * Build a plain-text snapshot block appended to loan_applications.notes.
 * Never mutates loan income fields — notes only.
 */
export function formatCalculatorApplyNote(input: {
  kind: CalculatorSaveKind | string;
  title: string;
  summary?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  savedAt?: string | Date | null;
  brokerName?: string | null;
}): string {
  const when = input.savedAt
    ? new Date(input.savedAt).toLocaleString("en-US")
    : new Date().toLocaleString("en-US");
  const kindLabel = calculatorKindLabel(input.kind);
  const summary = input.summary ?? {};
  const payload = input.payload ?? {};
  const lines: string[] = [
    "——— Calculator snapshot ———",
    `Kind: ${kindLabel}`,
    `Title: ${input.title || "(untitled)"}`,
    `Saved: ${when}`,
  ];
  if (input.brokerName?.trim()) {
    lines.push(`By: ${input.brokerName.trim()}`);
  }

  if (input.kind === "income") {
    const household =
      summary.household_total ??
      summary.householdTotal ??
      (payload as { householdTotal?: number }).householdTotal;
    lines.push(`Household qualifying income (mo): ${money(household)}`);
    const borrowers = Array.isArray(
      (payload as { borrowers?: unknown }).borrowers,
    )
      ? ((payload as { borrowers: Array<{ name?: string }> }).borrowers)
      : [];
    borrowers.forEach((b, i) => {
      const name = (b?.name ?? "").trim() || `Borrower ${i + 1}`;
      lines.push(`  · ${name}`);
    });
  } else {
    const sales =
      summary.sales_price ??
      summary.salesPrice ??
      (payload as { salesPrice?: number }).salesPrice;
    const payment =
      summary.total_monthly_payment ??
      summary.totalMonthlyPayment ??
      summary.payment;
    const loanAmt =
      summary.total_loan ??
      summary.totalLoan ??
      (payload as { totalLoan?: number }).totalLoan;
    const rate =
      summary.interest_rate ??
      summary.interestRate ??
      (payload as { interestRate?: number }).interestRate;
    const ltv = summary.ltv;
    const front = summary.front_end_ratio ?? summary.frontEndRatio;
    const back = summary.back_end_ratio ?? summary.backEndRatio;
    lines.push(`Sales price: ${money(sales)}`);
    if (loanAmt != null) lines.push(`Total loan: ${money(loanAmt)}`);
    if (rate != null) lines.push(`Rate: ${pct(rate)}`);
    if (payment != null) lines.push(`Est. monthly payment: ${money(payment)}`);
    if (ltv != null) lines.push(`LTV: ${pct(ltv)}`);
    if (front != null || back != null) {
      lines.push(
        `DTI: front ${front != null ? pct(front) : "—"} / back ${back != null ? pct(back) : "—"}`,
      );
    }
  }

  lines.push("——— end snapshot ———");
  return lines.join("\n");
}

/** Append snapshot to existing notes (never overwrite prior content). */
export function appendCalculatorNoteToLoanNotes(
  existingNotes: string | null | undefined,
  snapshotBlock: string,
): string {
  const prev = (existingNotes ?? "").trimEnd();
  if (!prev) return snapshotBlock;
  return `${prev}\n\n${snapshotBlock}`;
}
