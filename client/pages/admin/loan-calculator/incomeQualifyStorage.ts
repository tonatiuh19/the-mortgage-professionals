import type { WageEarnerWorksheet } from "@shared/income-qualify-engine";
import {
  blankBorrower,
  blankWorksheet,
  computeHousehold,
} from "@shared/income-qualify-engine";

const STORAGE_KEY = "tmp_income_qualify_saves_v1";
const MAX_SAVES = 50;

export interface SavedIncomeWorksheet {
  id: string;
  title: string;
  savedAt: string;
  brokerId: number;
  worksheet: WageEarnerWorksheet;
  householdTotal: number;
}

export type SaveIncomeResult =
  | { ok: true; row: SavedIncomeWorksheet }
  | { ok: false; error: "no_broker" | "quota" | "serialize" };

export function normalizeWageEarnerWorksheet(
  raw: unknown,
): WageEarnerWorksheet | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { borrowers?: unknown };
  if (!Array.isArray(o.borrowers) || o.borrowers.length < 1) return null;

  const borrowers = [0, 1, 2, 3].map((i) => {
    const src = (o.borrowers as unknown[])[i];
    const base = blankBorrower();
    if (!src || typeof src !== "object") return base;
    const b = src as Record<string, unknown>;
    const num = (k: string, fallback: number) => {
      const v = Number(b[k]);
      return Number.isFinite(v) ? v : fallback;
    };
    const stream = (k: string) => {
      const s = b[k];
      if (!s || typeof s !== "object") return { ytd: 0, year1: 0, year2: 0 };
      const r = s as Record<string, unknown>;
      return {
        ytd: Number(r.ytd) || 0,
        year1: Number(r.year1) || 0,
        year2: Number(r.year2) || 0,
      };
    };
    return {
      ...base,
      name: typeof b.name === "string" ? b.name : "",
      loanNumber: typeof b.loanNumber === "string" ? b.loanNumber : "",
      employer: typeof b.employer === "string" ? b.employer : "",
      payPeriodMonth: Math.min(
        12,
        Math.max(1, num("payPeriodMonth", base.payPeriodMonth)),
      ),
      payPeriodDay: Math.min(
        31,
        Math.max(1, num("payPeriodDay", base.payPeriodDay)),
      ),
      baseYtdAmount: Math.max(0, num("baseYtdAmount", 0)),
      baseMethod:
        b.baseMethod === "periodic_salary" ||
        b.baseMethod === "hourly" ||
        b.baseMethod === "w2_average" ||
        b.baseMethod === "annual_salary"
          ? b.baseMethod
          : "annual_salary",
      annualSalary: num("annualSalary", 0),
      periodicAmount: num("periodicAmount", 0),
      payFrequency:
        b.payFrequency === "weekly" ||
        b.payFrequency === "semimonthly" ||
        b.payFrequency === "monthly" ||
        b.payFrequency === "biweekly"
          ? b.payFrequency
          : "biweekly",
      hourlyRate: num("hourlyRate", 0),
      hoursPerWeek: num("hoursPerWeek", 40),
      w2Year1: num("w2Year1", 0),
      w2Year2: num("w2Year2", 0),
      overtime: stream("overtime"),
      commission: stream("commission"),
      bonus: stream("bonus"),
      nonTaxableMonthly: num("nonTaxableMonthly", 0),
      nonTaxableGrossUpPct: num("nonTaxableGrossUpPct", 0.25),
      deductionsMonthly: num("deductionsMonthly", 0),
      linkedClientId:
        b.linkedClientId == null || b.linkedClientId === ""
          ? null
          : Number.isFinite(Number(b.linkedClientId))
            ? Number(b.linkedClientId)
            : null,
      linkedPhone: typeof b.linkedPhone === "string" ? b.linkedPhone : "",
      linkedEmail: typeof b.linkedEmail === "string" ? b.linkedEmail : "",
    };
  }) as WageEarnerWorksheet["borrowers"];

  return { borrowers };
}

function cloneWorksheet(w: WageEarnerWorksheet): WageEarnerWorksheet {
  return JSON.parse(JSON.stringify(w)) as WageEarnerWorksheet;
}

function parseRow(raw: unknown): SavedIncomeWorksheet | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const brokerId = Number(o.brokerId);
  if (!Number.isFinite(brokerId) || brokerId <= 0) return null;
  const worksheet = normalizeWageEarnerWorksheet(o.worksheet);
  if (!worksheet) return null;
  return {
    id: o.id,
    title: typeof o.title === "string" ? o.title : "Wage Earner",
    savedAt:
      typeof o.savedAt === "string" ? o.savedAt : new Date().toISOString(),
    brokerId,
    worksheet,
    householdTotal: Number(o.householdTotal) || 0,
  };
}

function readAll(): SavedIncomeWorksheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseRow)
      .filter((r): r is SavedIncomeWorksheet => r != null);
  } catch {
    return [];
  }
}

function writeAll(rows: SavedIncomeWorksheet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function listSavedIncomeWorksheets(
  brokerId: number | null,
): SavedIncomeWorksheet[] {
  if (brokerId == null || !Number.isFinite(brokerId)) return [];
  return readAll()
    .filter((r) => r.brokerId === brokerId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveIncomeWorksheet(params: {
  title: string;
  brokerId: number | null;
  worksheet: WageEarnerWorksheet;
  replaceId?: string;
}): SaveIncomeResult {
  if (params.brokerId == null || !Number.isFinite(params.brokerId)) {
    return { ok: false, error: "no_broker" };
  }
  const worksheet = normalizeWageEarnerWorksheet(params.worksheet);
  if (!worksheet) return { ok: false, error: "serialize" };
  const householdTotal = computeHousehold(worksheet).householdTotal;
  const all = readAll();
  const row: SavedIncomeWorksheet = {
    id: params.replaceId || `inc_${Date.now()}`,
    title: params.title.trim() || "Wage Earner",
    savedAt: new Date().toISOString(),
    brokerId: params.brokerId,
    worksheet: cloneWorksheet(worksheet),
    householdTotal,
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

export function deleteSavedIncomeWorksheet(
  id: string,
  brokerId: number | null,
) {
  if (brokerId == null || !Number.isFinite(brokerId)) return;
  writeAll(readAll().filter((r) => !(r.id === id && r.brokerId === brokerId)));
}

export function __clearIncomeSavesForTests() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export { blankWorksheet };
