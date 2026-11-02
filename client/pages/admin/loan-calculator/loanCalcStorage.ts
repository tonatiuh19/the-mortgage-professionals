import type { LoanCalcInputs, LoanCalcKind } from "@shared/loan-calc-engine";
import { DEFAULT_INPUTS } from "@shared/loan-calc-engine";

const STORAGE_KEY = "tmp_loan_calc_saves_v1";
const MAX_SAVES = 50;

export interface SavedLoanCalculation {
  id: string;
  kind: Exclude<LoanCalcKind, "quick_payment">;
  title: string;
  savedAt: string;
  brokerId: number;
  inputs: LoanCalcInputs;
}

export type SaveCalculationResult =
  | { ok: true; row: SavedLoanCalculation }
  | { ok: false; error: "no_broker" | "quota" | "serialize" };

const KINDS = new Set([
  "fha",
  "va",
  "conventional",
  "investment",
  "mobile_home",
]);

function isLineItem(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    Number.isFinite(Number(o.amount))
  );
}

/** Normalize a partial/corrupt payload into a safe LoanCalcInputs clone. */
export function normalizeLoanCalcInputs(raw: unknown): LoanCalcInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const income = Array.isArray(o.income)
    ? o.income.filter(isLineItem).map((row) => {
        const r = row as { id: string; label: string; amount: number };
        return {
          id: String(r.id),
          label: String(r.label ?? ""),
          amount: Number(r.amount) || 0,
        };
      })
    : null;
  const debts = Array.isArray(o.debts)
    ? o.debts.filter(isLineItem).map((row) => {
        const r = row as { id: string; label: string; amount: number };
        return {
          id: String(r.id),
          label: String(r.label ?? ""),
          amount: Number(r.amount) || 0,
        };
      })
    : null;
  if (!income || !debts) return null;

  const num = (key: keyof LoanCalcInputs, fallback: number) => {
    const v = Number(o[key as string]);
    return Number.isFinite(v) ? v : fallback;
  };

  return {
    ...DEFAULT_INPUTS,
    salesPrice: num("salesPrice", 0),
    downPaymentPct: num("downPaymentPct", DEFAULT_INPUTS.downPaymentPct),
    interestRate: num("interestRate", DEFAULT_INPUTS.interestRate),
    upfrontMipPct: num("upfrontMipPct", DEFAULT_INPUTS.upfrontMipPct),
    miFactorPct: num("miFactorPct", DEFAULT_INPUTS.miFactorPct),
    vaFundingFeePct: num("vaFundingFeePct", DEFAULT_INPUTS.vaFundingFeePct),
    pmiAnnualPct: num("pmiAnnualPct", DEFAULT_INPUTS.pmiAnnualPct),
    annualTaxRatePct: num("annualTaxRatePct", DEFAULT_INPUTS.annualTaxRatePct),
    homeownersInsuranceMonthly: num(
      "homeownersInsuranceMonthly",
      DEFAULT_INPUTS.homeownersInsuranceMonthly,
    ),
    hoaMonthly: num("hoaMonthly", 0),
    rentalIncomeMonthly: num("rentalIncomeMonthly", 0),
    termYears: num("termYears", 30),
    bankBalance: num("bankBalance", 0),
    closingCostPct: num("closingCostPct", DEFAULT_INPUTS.closingCostPct),
    accountLast4: typeof o.accountLast4 === "string" ? o.accountLast4 : "",
    income: income.length
      ? income
      : DEFAULT_INPUTS.income.map((r) => ({ ...r })),
    debts: debts.length ? debts : DEFAULT_INPUTS.debts.map((r) => ({ ...r })),
  };
}

function cloneInputs(inputs: LoanCalcInputs): LoanCalcInputs {
  return {
    ...inputs,
    income: inputs.income.map((r) => ({ ...r })),
    debts: inputs.debts.map((r) => ({ ...r })),
  };
}

function parseRow(raw: unknown): SavedLoanCalculation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !KINDS.has(String(o.kind))) return null;
  const brokerId = Number(o.brokerId);
  if (!Number.isFinite(brokerId) || brokerId <= 0) return null;
  const inputs = normalizeLoanCalcInputs(o.inputs);
  if (!inputs) return null;
  return {
    id: o.id,
    kind: o.kind as Exclude<LoanCalcKind, "quick_payment">,
    title: typeof o.title === "string" ? o.title : "Saved scenario",
    savedAt:
      typeof o.savedAt === "string" ? o.savedAt : new Date().toISOString(),
    brokerId,
    inputs,
  };
}

function readAll(): SavedLoanCalculation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseRow)
      .filter((r): r is SavedLoanCalculation => r != null);
  } catch {
    return [];
  }
}

function writeAll(rows: SavedLoanCalculation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function listSavedCalculations(
  brokerId: number | null,
): SavedLoanCalculation[] {
  if (brokerId == null || !Number.isFinite(brokerId)) return [];
  return readAll()
    .filter((r) => r.brokerId === brokerId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveCalculation(params: {
  kind: Exclude<LoanCalcKind, "quick_payment">;
  title: string;
  brokerId: number | null;
  inputs: LoanCalcInputs;
  replaceId?: string;
}): SaveCalculationResult {
  if (params.brokerId == null || !Number.isFinite(params.brokerId)) {
    return { ok: false, error: "no_broker" };
  }
  const inputs = normalizeLoanCalcInputs(params.inputs);
  if (!inputs) {
    return { ok: false, error: "serialize" };
  }
  const all = readAll();
  const row: SavedLoanCalculation = {
    id: params.replaceId || `save_${Date.now()}`,
    kind: params.kind,
    title: params.title.trim() || `${params.kind.toUpperCase()} scenario`,
    savedAt: new Date().toISOString(),
    brokerId: params.brokerId,
    inputs: cloneInputs(inputs),
  };
  const next = params.replaceId
    ? all.map((r) => (r.id === params.replaceId ? row : r))
    : [row, ...all];
  try {
    writeAll(next.slice(0, MAX_SAVES));
  } catch {
    return { ok: false, error: "quota" };
  }
  return { ok: true, row };
}

export function deleteSavedCalculation(id: string, brokerId: number | null) {
  if (brokerId == null || !Number.isFinite(brokerId)) return;
  writeAll(
    readAll().filter((r) => !(r.id === id && r.brokerId === brokerId)),
  );
}

export function getSavedCalculation(
  id: string,
): SavedLoanCalculation | undefined {
  return readAll().find((r) => r.id === id);
}

/** Test helper — clear storage key */
export function __clearLoanCalcSavesForTests() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
