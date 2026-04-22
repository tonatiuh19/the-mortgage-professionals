import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  TrendingUp,
  FileText,
  Building2,
  Users,
  BarChart3,
  Heart,
  ChevronDown,
  Info,
  RotateCcw,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const fmtMonthly = (annual: number) => fmt(annual / 12);

function numVal(v: string): number {
  const n = parseFloat(v.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

// ─── shared field components ────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
}

function DollarField({
  label,
  hint,
  value,
  onChange,
  placeholder = "0",
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium text-foreground/80">
          {label}
        </Label>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
          $
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-7 h-10 text-sm"
          inputMode="decimal"
        />
      </div>
    </div>
  );
}

function PctField({
  label,
  hint,
  value,
  onChange,
  placeholder = "0",
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium text-foreground/80">
          {label}
        </Label>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-7 h-10 text-sm"
          inputMode="decimal"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
          %
        </span>
      </div>
    </div>
  );
}

interface YesNoProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}

function YesNoField({ label, hint, value, onChange }: YesNoProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium text-foreground/80">
          {label}
        </Label>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 text-sm">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── result card ─────────────────────────────────────────────────────────────

interface ResultCardProps {
  label: string;
  monthly: number;
  annual?: number;
  breakdown?: { label: string; value: number }[];
  color?: string;
}

function ResultCard({
  label,
  monthly,
  annual,
  breakdown,
  color = "primary",
}: ResultCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-card to-muted/20 shadow-sm overflow-hidden">
      <div className="p-6 text-center space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-4xl font-bold tabular-nums leading-none",
            monthly >= 0 ? "text-emerald-600" : "text-destructive",
          )}
        >
          {fmt(monthly)}
        </p>
        <p className="text-sm text-muted-foreground">per month</p>
        {annual !== undefined && (
          <p className="text-sm font-medium text-foreground/70 mt-1">
            {fmt(annual)} / year
          </p>
        )}
      </div>
      {breakdown && breakdown.length > 0 && (
        <>
          <Separator />
          <div className="p-4 space-y-2">
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Breakdown
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showBreakdown && "rotate-180",
                )}
              />
            </button>
            {showBreakdown && (
              <div className="space-y-1.5 pt-1 animate-in fade-in-0 slide-in-from-top-1">
                {breakdown.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        row.value >= 0 ? "text-foreground" : "text-destructive",
                      )}
                    >
                      {fmt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── tab definitions ─────────────────────────────────────────────────────────

type TabKey =
  | "rental"
  | "variable"
  | "scheduleC"
  | "sCorp"
  | "partnership"
  | "corporation"
  | "ssi";

const TABS: {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  shortLabel?: string;
}[] = [
  { key: "rental", label: "Rental Income", icon: <Home className="h-4 w-4" /> },
  {
    key: "variable",
    label: "Variable Income",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    key: "scheduleC",
    label: "Schedule C",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "sCorp",
    label: "S Corp 1120S",
    icon: <Building2 className="h-4 w-4" />,
    shortLabel: "S Corp",
  },
  {
    key: "partnership",
    label: "Partnership 1065",
    icon: <Users className="h-4 w-4" />,
    shortLabel: "Partnership",
  },
  {
    key: "corporation",
    label: "Corporation 1120",
    icon: <BarChart3 className="h-4 w-4" />,
    shortLabel: "Corp",
  },
  {
    key: "ssi",
    label: "SSI / Pension Gross Up",
    icon: <Heart className="h-4 w-4" />,
    shortLabel: "SSI",
  },
];

// ─── shared PDF types ────────────────────────────────────────────────────────

interface PDFResult {
  label: string;
  monthly: number;
  annual?: number;
  breakdown: { label: string; value: number }[];
}

interface TabProps {
  onResultChange?: (r: PDFResult | null) => void;
}

// ─── RENTAL INCOME ────────────────────────────────────────────────────────────

function useRentalCalc() {
  const [f, setF] = useState({
    showsRentalOnTax: "",
    taxesEscrowed: "",
    mortgagePayment: "",
    rentsReceived: "",
    insurance: "",
    mortgageInterest: "",
    taxes: "",
    depreciation: "",
    hoa: "",
    mileage: "",
    otherExpenses: "",
    vacancyFactor: "25",
    year1Rent: "",
    year2Rent: "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  const reset = () =>
    setF({
      showsRentalOnTax: "",
      taxesEscrowed: "",
      mortgagePayment: "",
      rentsReceived: "",
      insurance: "",
      mortgageInterest: "",
      taxes: "",
      depreciation: "",
      hoa: "",
      mileage: "",
      otherExpenses: "",
      vacancyFactor: "25",
      year1Rent: "",
      year2Rent: "",
    });

  const calc = useCallback(() => {
    const rents = numVal(f.rentsReceived);
    const insurance = numVal(f.insurance);
    const mortInt = numVal(f.mortgageInterest);
    const taxes = numVal(f.taxes);
    const dep = numVal(f.depreciation);
    const hoa = numVal(f.hoa);
    const mileage = numVal(f.mileage);
    const other = numVal(f.otherExpenses);
    const vacancy = numVal(f.vacancyFactor) / 100;
    const mortPay = numVal(f.mortgagePayment);

    if (!f.showsRentalOnTax) return null;

    if (f.showsRentalOnTax === "no") {
      // Use Schedule E approach: rents × (1 - vacancy) - PITI
      const effectiveRent = rents * (1 - vacancy);
      const piti = mortPay;
      const monthly = (effectiveRent - piti) / 12;
      return {
        monthly,
        breakdown: [
          { label: "Effective Rent (annual)", value: effectiveRent },
          { label: "Less: PITI", value: -piti },
        ],
      };
    }

    // From tax return
    const addBack =
      dep +
      mortInt +
      taxes +
      (f.taxesEscrowed === "no" ? insurance : 0) +
      hoa +
      mileage;
    const netAnnual =
      rents -
      insurance -
      mortInt -
      taxes -
      dep -
      hoa -
      mileage -
      other +
      addBack;
    const monthly = netAnnual / 12;
    return {
      monthly,
      breakdown: [
        { label: "Rents Received", value: rents },
        { label: "Add Back: Depreciation", value: dep },
        { label: "Less: Other Expenses", value: -other },
      ],
    };
  }, [f]);

  return { f, set, reset, calc };
}

function RentalTab({ onResultChange }: TabProps = {}) {
  const { f, set, reset, calc } = useRentalCalc();
  const result = calc();
  onResultChange?.(
    result
      ? {
          label: "Monthly Rental Income",
          monthly: result.monthly,
          annual: result.monthly * 12,
          breakdown: result.breakdown,
        }
      : null,
  );
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-5">
        <YesNoField
          label="Does the most recent year of 1040 returns show rental income?"
          value={f.showsRentalOnTax}
          onChange={set("showsRentalOnTax")}
          hint="If yes, we'll use the Schedule E figures from the tax return."
        />
        {f.showsRentalOnTax === "yes" && (
          <YesNoField
            label="Are taxes and insurance for the property escrowed?"
            value={f.taxesEscrowed}
            onChange={set("taxesEscrowed")}
          />
        )}
        <DollarField
          label="Total Mortgage Payment (PITI)"
          value={f.mortgagePayment}
          onChange={set("mortgagePayment")}
          hint="Principal + Interest + Taxes + Insurance"
        />
        <DollarField
          label="Total Rents Received (Line 3)"
          value={f.rentsReceived}
          onChange={set("rentsReceived")}
        />
        {f.showsRentalOnTax === "yes" && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <DollarField
                label="Insurance (Line 9)"
                value={f.insurance}
                onChange={set("insurance")}
              />
              <DollarField
                label="Mortgage Interest Paid (Line 12)"
                value={f.mortgageInterest}
                onChange={set("mortgageInterest")}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <DollarField
                label="Taxes (Line 16)"
                value={f.taxes}
                onChange={set("taxes")}
              />
              <DollarField
                label="Depreciation / Depletion (Line 18)"
                value={f.depreciation}
                onChange={set("depreciation")}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <DollarField
                label="HOA Dues (yearly)"
                value={f.hoa}
                onChange={set("hoa")}
              />
              <DollarField
                label="Mileage / Business Miles ($)"
                value={f.mileage}
                onChange={set("mileage")}
              />
            </div>
            <DollarField
              label="Other Deductible Expenses"
              value={f.otherExpenses}
              onChange={set("otherExpenses")}
            />
          </>
        )}
        {f.showsRentalOnTax === "no" && (
          <PctField
            label="Vacancy Factor"
            hint="Standard is 25%. Adjust if local market differs."
            value={f.vacancyFactor}
            onChange={set("vacancyFactor")}
          />
        )}
      </div>
      <div className="space-y-4 lg:sticky lg:top-6">
        <ResultCard
          label="Monthly Rental Income"
          monthly={result?.monthly ?? 0}
          annual={result ? result.monthly * 12 : 0}
          breakdown={result?.breakdown}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="w-full gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}

// ─── VARIABLE INCOME ─────────────────────────────────────────────────────────

function VariableTab({ onResultChange }: TabProps = {}) {
  const [f, setF] = useState({
    year1: "",
    year2: "",
    hasOT: "",
    ot1: "",
    ot2: "",
    hasBonus: "",
    bonus1: "",
    bonus2: "",
    hasCommission: "",
    comm1: "",
    comm2: "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  const reset = () =>
    setF({
      year1: "",
      year2: "",
      hasOT: "",
      ot1: "",
      ot2: "",
      hasBonus: "",
      bonus1: "",
      bonus2: "",
      hasCommission: "",
      comm1: "",
      comm2: "",
    });

  const avg2 = (a: string, b: string) => (numVal(a) + numVal(b)) / 2;

  const baseAvg = avg2(f.year1, f.year2);
  const otAvg = f.hasOT === "yes" ? avg2(f.ot1, f.ot2) : 0;
  const bonusAvg = f.hasBonus === "yes" ? avg2(f.bonus1, f.bonus2) : 0;
  const commAvg = f.hasCommission === "yes" ? avg2(f.comm1, f.comm2) : 0;
  const totalAnnual = baseAvg + otAvg + bonusAvg + commAvg;
  const monthly = totalAnnual / 12;

  onResultChange?.({
    label: "Qualifying Monthly Income",
    monthly,
    annual: totalAnnual,
    breakdown: [
      { label: "Base (2-yr avg / mo)", value: baseAvg / 12 },
      ...(otAvg ? [{ label: "Overtime / mo", value: otAvg / 12 }] : []),
      ...(bonusAvg ? [{ label: "Bonus / mo", value: bonusAvg / 12 }] : []),
      ...(commAvg ? [{ label: "Commission / mo", value: commAvg / 12 }] : []),
    ],
  });

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <DollarField
            label="Base Income — Year 1 (Annual)"
            value={f.year1}
            onChange={set("year1")}
            hint="Most recent prior year W-2 Box 1 or paystub YTD annualized"
          />
          <DollarField
            label="Base Income — Year 2 (Annual)"
            value={f.year2}
            onChange={set("year2")}
          />
        </div>
        <YesNoField
          label="Include Overtime Income?"
          value={f.hasOT}
          onChange={set("hasOT")}
        />
        {f.hasOT === "yes" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <DollarField
              label="Overtime — Year 1"
              value={f.ot1}
              onChange={set("ot1")}
            />
            <DollarField
              label="Overtime — Year 2"
              value={f.ot2}
              onChange={set("ot2")}
            />
          </div>
        )}
        <YesNoField
          label="Include Bonus Income?"
          value={f.hasBonus}
          onChange={set("hasBonus")}
          hint="Must have 2-year history to count."
        />
        {f.hasBonus === "yes" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <DollarField
              label="Bonus — Year 1"
              value={f.bonus1}
              onChange={set("bonus1")}
            />
            <DollarField
              label="Bonus — Year 2"
              value={f.bonus2}
              onChange={set("bonus2")}
            />
          </div>
        )}
        <YesNoField
          label="Include Commission Income?"
          value={f.hasCommission}
          onChange={set("hasCommission")}
        />
        {f.hasCommission === "yes" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <DollarField
              label="Commission — Year 1"
              value={f.comm1}
              onChange={set("comm1")}
            />
            <DollarField
              label="Commission — Year 2"
              value={f.comm2}
              onChange={set("comm2")}
            />
          </div>
        )}
      </div>
      <div className="space-y-4 lg:sticky lg:top-6">
        <ResultCard
          label="Qualifying Monthly Income"
          monthly={monthly}
          annual={totalAnnual}
          breakdown={[
            { label: "Base (2-yr avg / mo)", value: baseAvg / 12 },
            ...(otAvg ? [{ label: "Overtime / mo", value: otAvg / 12 }] : []),
            ...(bonusAvg
              ? [{ label: "Bonus / mo", value: bonusAvg / 12 }]
              : []),
            ...(commAvg
              ? [{ label: "Commission / mo", value: commAvg / 12 }]
              : []),
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="w-full gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}

// ─── SCHEDULE C ──────────────────────────────────────────────────────────────

function ScheduleCTab({ onResultChange }: TabProps = {}) {
  const [f, setF] = useState({
    grossIncome1: "",
    expenses1: "",
    depreciation1: "",
    mileage1: "",
    meals1: "",
    homeOffice1: "",
    grossIncome2: "",
    expenses2: "",
    depreciation2: "",
    mileage2: "",
    meals2: "",
    homeOffice2: "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  const reset = () =>
    setF({
      grossIncome1: "",
      expenses1: "",
      depreciation1: "",
      mileage1: "",
      meals1: "",
      homeOffice1: "",
      grossIncome2: "",
      expenses2: "",
      depreciation2: "",
      mileage2: "",
      meals2: "",
      homeOffice2: "",
    });

  const calcYear = (
    g: string,
    e: string,
    dep: string,
    mil: string,
    meals: string,
    ho: string,
  ) => {
    const gross = numVal(g);
    const exp = numVal(e);
    const d = numVal(dep);
    const m = numVal(mil);
    const ml = numVal(meals);
    const home = numVal(ho);
    return gross - exp + d + m + ml * 0.5 + home;
  };

  const y1 = calcYear(
    f.grossIncome1,
    f.expenses1,
    f.depreciation1,
    f.mileage1,
    f.meals1,
    f.homeOffice1,
  );
  const y2 = calcYear(
    f.grossIncome2,
    f.expenses2,
    f.depreciation2,
    f.mileage2,
    f.meals2,
    f.homeOffice2,
  );
  const avg = (y1 + y2) / 2;
  const monthly = avg / 12;

  onResultChange?.({
    label: "Qualifying Monthly Income",
    monthly,
    annual: avg,
    breakdown: [
      { label: "Year 1 Net (annual)", value: y1 },
      { label: "Year 2 Net (annual)", value: y2 },
      { label: "2-Year Average", value: avg },
    ],
  });

  const YearSection = ({ yr, label }: { yr: 1 | 2; label: string }) => (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground/70 border-b pb-1">
        {label}
      </h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Gross Income (Line 7)"
          value={f[`grossIncome${yr}`]}
          onChange={set(`grossIncome${yr}` as any)}
        />
        <DollarField
          label="Total Expenses (Line 28)"
          value={f[`expenses${yr}`]}
          onChange={set(`expenses${yr}` as any)}
          hint="Before add-backs"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Depreciation (Line 13)"
          value={f[`depreciation${yr}`]}
          onChange={set(`depreciation${yr}` as any)}
        />
        <DollarField
          label="Mileage (Line 9 — $)"
          value={f[`mileage${yr}`]}
          onChange={set(`mileage${yr}` as any)}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Meals (Line 24b — 50% added back)"
          value={f[`meals${yr}`]}
          onChange={set(`meals${yr}` as any)}
        />
        <DollarField
          label="Home Office (Line 30)"
          value={f[`homeOffice${yr}`]}
          onChange={set(`homeOffice${yr}` as any)}
        />
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6">
        <YearSection yr={1} label="Year 1 (Most Recent)" />
        <YearSection yr={2} label="Year 2 (Prior Year)" />
      </div>
      <div className="space-y-4 lg:sticky lg:top-6">
        <ResultCard
          label="Qualifying Monthly Income"
          monthly={monthly}
          annual={avg}
          breakdown={[
            { label: "Year 1 Net (annual)", value: y1 },
            { label: "Year 2 Net (annual)", value: y2 },
            { label: "2-Year Average", value: avg },
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="w-full gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}

// ─── S CORP 1120S ─────────────────────────────────────────────────────────────

function SCorpTab({ onResultChange }: TabProps = {}) {
  const [ownership, setOwnership] = useState("100");
  const [f, setF] = useState({
    w2_1: "",
    w2_2: "",
    ordIncome1: "",
    ordIncome2: "",
    depreciation1: "",
    depreciation2: "",
    depletion1: "",
    depletion2: "",
    amort1: "",
    amort2: "",
    meals1: "",
    meals2: "",
    nonRecurring1: "",
    nonRecurring2: "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  const reset = () => {
    setOwnership("100");
    setF({
      w2_1: "",
      w2_2: "",
      ordIncome1: "",
      ordIncome2: "",
      depreciation1: "",
      depreciation2: "",
      depletion1: "",
      depletion2: "",
      amort1: "",
      amort2: "",
      meals1: "",
      meals2: "",
      nonRecurring1: "",
      nonRecurring2: "",
    });
  };

  const pct = numVal(ownership) / 100;
  const calcYear = (
    w: string,
    oi: string,
    dep: string,
    depl: string,
    am: string,
    meals: string,
    nr: string,
  ) => {
    const base =
      numVal(w) +
      (numVal(oi) +
        numVal(dep) +
        numVal(depl) +
        numVal(am) +
        numVal(meals) * 0.5 -
        numVal(nr)) *
        pct;
    return base;
  };
  const y1 = calcYear(
    f.w2_1,
    f.ordIncome1,
    f.depreciation1,
    f.depletion1,
    f.amort1,
    f.meals1,
    f.nonRecurring1,
  );
  const y2 = calcYear(
    f.w2_2,
    f.ordIncome2,
    f.depreciation2,
    f.depletion2,
    f.amort2,
    f.meals2,
    f.nonRecurring2,
  );
  const avg = (y1 + y2) / 2;
  const monthly = avg / 12;

  onResultChange?.({
    label: "Qualifying Monthly Income",
    monthly,
    annual: avg,
    breakdown: [
      { label: "Year 1 (annual)", value: y1 },
      { label: "Year 2 (annual)", value: y2 },
      { label: "2-Year Average", value: avg },
    ],
  });

  const YearSection = ({ yr, label }: { yr: 1 | 2; label: string }) => (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground/70 border-b pb-1">
        {label}
      </h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="W-2 Wages (from 1120S)"
          value={f[`w2_${yr}`]}
          onChange={set(`w2_${yr}` as any)}
        />
        <DollarField
          label="Ordinary Business Income (Line 1)"
          value={f[`ordIncome${yr}`]}
          onChange={set(`ordIncome${yr}` as any)}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Depreciation (Line 14)"
          value={f[`depreciation${yr}`]}
          onChange={set(`depreciation${yr}` as any)}
        />
        <DollarField
          label="Depletion (Line 15)"
          value={f[`depletion${yr}`]}
          onChange={set(`depletion${yr}` as any)}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Amortization / Casualty Loss"
          value={f[`amort${yr}`]}
          onChange={set(`amort${yr}` as any)}
        />
        <DollarField
          label="Meals (50% add-back)"
          value={f[`meals${yr}`]}
          onChange={set(`meals${yr}` as any)}
        />
      </div>
      <DollarField
        label="Non-Recurring Income (subtract)"
        value={f[`nonRecurring${yr}`]}
        onChange={set(`nonRecurring${yr}` as any)}
        hint="One-time income items not expected to continue"
      />
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6">
        <PctField
          label="Ownership %"
          hint="Borrower's ownership percentage in the S-Corp"
          value={ownership}
          onChange={setOwnership}
        />
        <YearSection yr={1} label="Year 1 (Most Recent)" />
        <YearSection yr={2} label="Year 2 (Prior Year)" />
      </div>
      <div className="space-y-4 lg:sticky lg:top-6">
        <ResultCard
          label="Qualifying Monthly Income"
          monthly={monthly}
          annual={avg}
          breakdown={[
            { label: "Year 1 (annual)", value: y1 },
            { label: "Year 2 (annual)", value: y2 },
            { label: "2-Year Average", value: avg },
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="w-full gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}

// ─── PARTNERSHIP 1065 ─────────────────────────────────────────────────────────

function PartnershipTab({ onResultChange }: TabProps = {}) {
  const [ownership, setOwnership] = useState("100");
  const [f, setF] = useState({
    ordIncome1: "",
    ordIncome2: "",
    guar1: "",
    guar2: "",
    depreciation1: "",
    depreciation2: "",
    depletion1: "",
    depletion2: "",
    amort1: "",
    amort2: "",
    meals1: "",
    meals2: "",
    nonRecurring1: "",
    nonRecurring2: "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  const reset = () => {
    setOwnership("100");
    setF({
      ordIncome1: "",
      ordIncome2: "",
      guar1: "",
      guar2: "",
      depreciation1: "",
      depreciation2: "",
      depletion1: "",
      depletion2: "",
      amort1: "",
      amort2: "",
      meals1: "",
      meals2: "",
      nonRecurring1: "",
      nonRecurring2: "",
    });
  };

  const pct = numVal(ownership) / 100;
  const calcYear = (
    oi: string,
    guar: string,
    dep: string,
    depl: string,
    am: string,
    meals: string,
    nr: string,
  ) => {
    return (
      (numVal(oi) +
        numVal(dep) +
        numVal(depl) +
        numVal(am) +
        numVal(meals) * 0.5 -
        numVal(nr)) *
        pct +
      numVal(guar)
    );
  };
  const y1 = calcYear(
    f.ordIncome1,
    f.guar1,
    f.depreciation1,
    f.depletion1,
    f.amort1,
    f.meals1,
    f.nonRecurring1,
  );
  const y2 = calcYear(
    f.ordIncome2,
    f.guar2,
    f.depreciation2,
    f.depletion2,
    f.amort2,
    f.meals2,
    f.nonRecurring2,
  );
  const avg = (y1 + y2) / 2;
  const monthly = avg / 12;

  onResultChange?.({
    label: "Qualifying Monthly Income",
    monthly,
    annual: avg,
    breakdown: [
      { label: "Year 1 (annual)", value: y1 },
      { label: "Year 2 (annual)", value: y2 },
      { label: "2-Year Average", value: avg },
    ],
  });

  const YearSection = ({ yr, label }: { yr: 1 | 2; label: string }) => (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground/70 border-b pb-1">
        {label}
      </h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Ordinary Business Income (Line 1)"
          value={f[`ordIncome${yr}`]}
          onChange={set(`ordIncome${yr}` as any)}
        />
        <DollarField
          label="Guaranteed Payments (Line 4)"
          value={f[`guar${yr}`]}
          onChange={set(`guar${yr}` as any)}
          hint="Not multiplied by ownership %"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Depreciation"
          value={f[`depreciation${yr}`]}
          onChange={set(`depreciation${yr}` as any)}
        />
        <DollarField
          label="Depletion"
          value={f[`depletion${yr}`]}
          onChange={set(`depletion${yr}` as any)}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Amortization / Casualty Loss"
          value={f[`amort${yr}`]}
          onChange={set(`amort${yr}` as any)}
        />
        <DollarField
          label="Meals (50% add-back)"
          value={f[`meals${yr}`]}
          onChange={set(`meals${yr}` as any)}
        />
      </div>
      <DollarField
        label="Non-Recurring Income (subtract)"
        value={f[`nonRecurring${yr}`]}
        onChange={set(`nonRecurring${yr}` as any)}
      />
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6">
        <PctField
          label="Ownership %"
          value={ownership}
          onChange={setOwnership}
        />
        <YearSection yr={1} label="Year 1 (Most Recent)" />
        <YearSection yr={2} label="Year 2 (Prior Year)" />
      </div>
      <div className="space-y-4 lg:sticky lg:top-6">
        <ResultCard
          label="Qualifying Monthly Income"
          monthly={monthly}
          annual={avg}
          breakdown={[
            { label: "Year 1 (annual)", value: y1 },
            { label: "Year 2 (annual)", value: y2 },
            { label: "2-Year Average", value: avg },
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="w-full gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}

// ─── CORPORATION 1120 ─────────────────────────────────────────────────────────

function CorporationTab({ onResultChange }: TabProps = {}) {
  const [ownership, setOwnership] = useState("100");
  const [f, setF] = useState({
    taxableIncome1: "",
    taxableIncome2: "",
    depreciation1: "",
    depreciation2: "",
    depletion1: "",
    depletion2: "",
    amort1: "",
    amort2: "",
    meals1: "",
    meals2: "",
    nonRecurring1: "",
    nonRecurring2: "",
    w2_1: "",
    w2_2: "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  const reset = () => {
    setOwnership("100");
    setF({
      taxableIncome1: "",
      taxableIncome2: "",
      depreciation1: "",
      depreciation2: "",
      depletion1: "",
      depletion2: "",
      amort1: "",
      amort2: "",
      meals1: "",
      meals2: "",
      nonRecurring1: "",
      nonRecurring2: "",
      w2_1: "",
      w2_2: "",
    });
  };

  const pct = numVal(ownership) / 100;
  const calcYear = (
    w: string,
    ti: string,
    dep: string,
    depl: string,
    am: string,
    meals: string,
    nr: string,
  ) => {
    return (
      numVal(w) +
      (numVal(ti) +
        numVal(dep) +
        numVal(depl) +
        numVal(am) +
        numVal(meals) * 0.5 -
        numVal(nr)) *
        pct
    );
  };
  const y1 = calcYear(
    f.w2_1,
    f.taxableIncome1,
    f.depreciation1,
    f.depletion1,
    f.amort1,
    f.meals1,
    f.nonRecurring1,
  );
  const y2 = calcYear(
    f.w2_2,
    f.taxableIncome2,
    f.depreciation2,
    f.depletion2,
    f.amort2,
    f.meals2,
    f.nonRecurring2,
  );
  const avg = (y1 + y2) / 2;
  const monthly = avg / 12;

  onResultChange?.({
    label: "Qualifying Monthly Income",
    monthly,
    annual: avg,
    breakdown: [
      { label: "Year 1 (annual)", value: y1 },
      { label: "Year 2 (annual)", value: y2 },
      { label: "2-Year Average", value: avg },
    ],
  });

  const YearSection = ({ yr, label }: { yr: 1 | 2; label: string }) => (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground/70 border-b pb-1">
        {label}
      </h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="W-2 Wages"
          value={f[`w2_${yr}`]}
          onChange={set(`w2_${yr}` as any)}
        />
        <DollarField
          label="Taxable Income (Line 30)"
          value={f[`taxableIncome${yr}`]}
          onChange={set(`taxableIncome${yr}` as any)}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Depreciation (Line 20)"
          value={f[`depreciation${yr}`]}
          onChange={set(`depreciation${yr}` as any)}
        />
        <DollarField
          label="Depletion"
          value={f[`depletion${yr}`]}
          onChange={set(`depletion${yr}` as any)}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DollarField
          label="Amortization / Casualty Loss"
          value={f[`amort${yr}`]}
          onChange={set(`amort${yr}` as any)}
        />
        <DollarField
          label="Meals (50% add-back)"
          value={f[`meals${yr}`]}
          onChange={set(`meals${yr}` as any)}
        />
      </div>
      <DollarField
        label="Non-Recurring Income (subtract)"
        value={f[`nonRecurring${yr}`]}
        onChange={set(`nonRecurring${yr}` as any)}
      />
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6">
        <PctField
          label="Ownership %"
          value={ownership}
          onChange={setOwnership}
        />
        <YearSection yr={1} label="Year 1 (Most Recent)" />
        <YearSection yr={2} label="Year 2 (Prior Year)" />
      </div>
      <div className="space-y-4 lg:sticky lg:top-6">
        <ResultCard
          label="Qualifying Monthly Income"
          monthly={monthly}
          annual={avg}
          breakdown={[
            { label: "Year 1 (annual)", value: y1 },
            { label: "Year 2 (annual)", value: y2 },
            { label: "2-Year Average", value: avg },
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="w-full gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}

// ─── SSI / PENSION GROSS UP ──────────────────────────────────────────────────

function SSITab({ onResultChange }: TabProps = {}) {
  const [f, setF] = useState({
    ssiMonthly: "",
    pensionMonthly: "",
    isTaxable: "",
    grossUpPct: "25",
    socialSecurity: "",
    disabilityMonthly: "",
    childSupport: "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  const reset = () =>
    setF({
      ssiMonthly: "",
      pensionMonthly: "",
      isTaxable: "",
      grossUpPct: "25",
      socialSecurity: "",
      disabilityMonthly: "",
      childSupport: "",
    });

  const grossUp = 1 + numVal(f.grossUpPct) / 100;

  const ssi = numVal(f.ssiMonthly) * (f.isTaxable === "no" ? grossUp : 1);
  const pension =
    numVal(f.pensionMonthly) * (f.isTaxable === "no" ? grossUp : 1);
  const ss = numVal(f.socialSecurity) * (f.isTaxable === "no" ? grossUp : 1);
  const disability =
    numVal(f.disabilityMonthly) * (f.isTaxable === "no" ? grossUp : 1);
  const childSupport = numVal(f.childSupport);

  const monthly = ssi + pension + ss + disability + childSupport;

  onResultChange?.({
    label: "Qualifying Monthly Income",
    monthly,
    breakdown: [
      ...(ssi
        ? [
            {
              label: `SSI${f.isTaxable === "no" ? " (grossed up)" : ""}`,
              value: ssi,
            },
          ]
        : []),
      ...(pension
        ? [
            {
              label: `Pension${f.isTaxable === "no" ? " (grossed up)" : ""}`,
              value: pension,
            },
          ]
        : []),
      ...(ss
        ? [
            {
              label: `Social Security${f.isTaxable === "no" ? " (grossed up)" : ""}`,
              value: ss,
            },
          ]
        : []),
      ...(disability
        ? [
            {
              label: `Disability${f.isTaxable === "no" ? " (grossed up)" : ""}`,
              value: disability,
            },
          ]
        : []),
      ...(childSupport
        ? [{ label: "Child Support / Alimony", value: childSupport }]
        : []),
    ],
  });

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-5">
        <YesNoField
          label="Is this income taxable?"
          hint="Non-taxable income (SSI, certain pensions) may be grossed up per agency guidelines."
          value={f.isTaxable}
          onChange={set("isTaxable")}
        />
        {f.isTaxable === "no" && (
          <PctField
            label="Gross-Up Percentage"
            hint="FHA/VA allow 25%. Conventional Fannie/Freddie allow up to 25%. Enter the applicable rate."
            value={f.grossUpPct}
            onChange={set("grossUpPct")}
          />
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <DollarField
            label="SSI Monthly"
            value={f.ssiMonthly}
            onChange={set("ssiMonthly")}
          />
          <DollarField
            label="Pension Monthly"
            value={f.pensionMonthly}
            onChange={set("pensionMonthly")}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <DollarField
            label="Social Security Monthly"
            value={f.socialSecurity}
            onChange={set("socialSecurity")}
          />
          <DollarField
            label="Disability Monthly"
            value={f.disabilityMonthly}
            onChange={set("disabilityMonthly")}
          />
        </div>
        <DollarField
          label="Child Support / Alimony (Monthly)"
          hint="Must have 3+ years remaining to count."
          value={f.childSupport}
          onChange={set("childSupport")}
        />
      </div>
      <div className="space-y-4 lg:sticky lg:top-6">
        <ResultCard
          label="Qualifying Monthly Income"
          monthly={monthly}
          breakdown={[
            ...(ssi
              ? [
                  {
                    label: `SSI${f.isTaxable === "no" ? " (grossed up)" : ""}`,
                    value: ssi,
                  },
                ]
              : []),
            ...(pension
              ? [
                  {
                    label: `Pension${f.isTaxable === "no" ? " (grossed up)" : ""}`,
                    value: pension,
                  },
                ]
              : []),
            ...(ss
              ? [
                  {
                    label: `Social Security${f.isTaxable === "no" ? " (grossed up)" : ""}`,
                    value: ss,
                  },
                ]
              : []),
            ...(disability
              ? [
                  {
                    label: `Disability${f.isTaxable === "no" ? " (grossed up)" : ""}`,
                    value: disability,
                  },
                ]
              : []),
            ...(childSupport
              ? [{ label: "Child Support / Alimony", value: childSupport }]
              : []),
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="w-full gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

const COMPANY_LOGO_URL =
  "https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png";

const IncomeCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("rental");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfResultRef = useRef<PDFResult | null>(null);

  const handleResultChange = useCallback((r: PDFResult | null) => {
    pdfResultRef.current = r;
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const result = pdfResultRef.current;
    const activeTabLabel =
      TABS.find((t) => t.key === activeTab)?.label ?? "Income Calculator";
    setIsGeneratingPdf(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = ((await import("html2pdf.js")) as any).default;
      const proxiedLogo = `/api/image-proxy?url=${encodeURIComponent(COMPANY_LOGO_URL)}`;

      const fmtCurrency = (n: number) =>
        n.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        });

      const monthlyStr = result ? fmtCurrency(result.monthly) : "$0.00";
      const annualStr = fmtCurrency(
        result?.annual ?? (result?.monthly ?? 0) * 12,
      );
      const resultLabel = result?.label ?? "Qualifying Monthly Income";

      const breakdownRows = (result?.breakdown ?? [])
        .map(
          (b) => `
          <tr>
            <td style="padding:10px 16px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">${b.label}</td>
            <td style="padding:10px 16px;font-size:13px;color:${b.value < 0 ? "#ef4444" : "#1e293b"};text-align:right;font-weight:600;border-bottom:1px solid #f1f5f9;">${fmtCurrency(b.value)}</td>
          </tr>`,
        )
        .join("");

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;width:816px;padding:40px;background:#ffffff;box-sizing:border-box;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:20px;margin-bottom:28px;">
            <img src="${proxiedLogo}" alt="Company Logo" style="max-height:56px;max-width:180px;object-fit:contain;" />
            <div style="text-align:right;">
              <div style="font-size:20px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;">Income Calculator</div>
              <div style="font-size:14px;color:#2563eb;font-weight:600;margin-top:2px;">${activeTabLabel}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Fannie Mae &middot; Freddie Mac &middot; FHA &middot; VA guidelines</div>
            </div>
          </div>
          <div style="background:linear-gradient(135deg,#eff6ff 0%,#e0f2fe 100%);border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;border:1px solid #bfdbfe;">
            <div style="font-size:11px;font-weight:600;color:#2563eb;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">${resultLabel}</div>
            <div style="font-size:52px;font-weight:800;color:#1e40af;letter-spacing:-2px;">${monthlyStr}</div>
            <div style="font-size:15px;color:#475569;margin-top:8px;">per month &nbsp;&middot;&nbsp; <strong style="color:#1e293b;">${annualStr}</strong> per year</div>
          </div>
          ${
            result && result.breakdown.length > 0
              ? `<div style="margin-bottom:28px;">
            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:12px;padding-left:4px;">Calculation Breakdown</div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="text-align:left;padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Component</th>
                  <th style="text-align:right;padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
                </tr>
              </thead>
              <tbody>${breakdownRows}</tbody>
            </table>
          </div>`
              : ""
          }
          <div style="border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:#94a3b8;">Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            <span style="font-size:10px;color:#94a3b8;">All figures are estimates &mdash; verify with your underwriting team.</span>
          </div>
        </div>`;

      await html2pdf()
        .set({
          margin: 0,
          filename: `Income-Calculator-${activeTabLabel.replace(/\s+/g, "-")}.pdf`,
          image: { type: "jpeg", quality: 0.97 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: 816,
          },
          jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
        })
        .from(html, "string")
        .save();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("PDF generation failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Income Calculator
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Calculate qualifying income for mortgage applications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs hidden sm:flex">
              Fannie / Freddie / FHA / VA guidelines
            </Badge>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="gap-2 shrink-0"
            >
              <Download className="h-4 w-4" />
              {isGeneratingPdf ? "Generating…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tab bar — scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 min-w-max sm:flex-wrap sm:min-w-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab label + description */}
        <div className="space-y-1">
          {TABS.filter((t) => t.key === activeTab).map((tab) => (
            <div key={tab.key} className="flex items-center gap-2">
              <div className="text-primary">{tab.icon}</div>
              <h2 className="text-base font-semibold text-foreground">
                {tab.label}
              </h2>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Fields marked with{" "}
            <Info className="inline h-3 w-3 text-muted-foreground" /> contain
            guidelines. All calculations are estimates — verify with your
            underwriting team.
          </p>
        </div>

        {/* Tab content — all kept mounted to preserve state; active one visible */}
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <div style={{ display: activeTab === "rental" ? undefined : "none" }}>
            <RentalTab
              onResultChange={
                activeTab === "rental" ? handleResultChange : undefined
              }
            />
          </div>
          <div
            style={{ display: activeTab === "variable" ? undefined : "none" }}
          >
            <VariableTab
              onResultChange={
                activeTab === "variable" ? handleResultChange : undefined
              }
            />
          </div>
          <div
            style={{ display: activeTab === "scheduleC" ? undefined : "none" }}
          >
            <ScheduleCTab
              onResultChange={
                activeTab === "scheduleC" ? handleResultChange : undefined
              }
            />
          </div>
          <div style={{ display: activeTab === "sCorp" ? undefined : "none" }}>
            <SCorpTab
              onResultChange={
                activeTab === "sCorp" ? handleResultChange : undefined
              }
            />
          </div>
          <div
            style={{
              display: activeTab === "partnership" ? undefined : "none",
            }}
          >
            <PartnershipTab
              onResultChange={
                activeTab === "partnership" ? handleResultChange : undefined
              }
            />
          </div>
          <div
            style={{
              display: activeTab === "corporation" ? undefined : "none",
            }}
          >
            <CorporationTab
              onResultChange={
                activeTab === "corporation" ? handleResultChange : undefined
              }
            />
          </div>
          <div style={{ display: activeTab === "ssi" ? undefined : "none" }}>
            <SSITab
              onResultChange={
                activeTab === "ssi" ? handleResultChange : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeCalculator;
