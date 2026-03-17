import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Calculator as CalcIcon,
  Home,
  TrendingDown,
  DollarSign,
  Percent,
  ChevronDown,
  Info,
  BarChart3,
  PieChart,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

type CalcType = "purchase" | "refinance";
type LoanType = "conventional" | "fha" | "va" | "jumbo";
type Term = 10 | 15 | 20 | 25 | 30;

// ─── Helpers ──────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n));

function calcMortgage(
  homePrice: number,
  downPayment: number,
  annualRate: number,
  termYears: number,
  annualTaxes: number,
  annualInsurance: number,
  monthlyHOA: number,
  otherAnnual: number,
) {
  const principal = homePrice - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const n = termYears * 12;

  let pi = 0;
  if (annualRate === 0) {
    pi = principal / n;
  } else {
    pi =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
      (Math.pow(1 + monthlyRate, n) - 1);
  }

  const monthlyTax = annualTaxes / 12;
  const monthlyIns = annualInsurance / 12;
  const monthlyOther = otherAnnual / 12;

  // PMI: ~0.5% / year if LTV > 80%
  const ltv = principal / homePrice;
  const pmi = ltv > 0.8 ? (principal * 0.005) / 12 : 0;

  const total = pi + monthlyTax + monthlyIns + monthlyHOA + monthlyOther + pmi;

  return {
    principal,
    pi,
    monthlyTax,
    monthlyIns,
    monthlyHOA,
    monthlyOther,
    pmi,
    total,
    ltv,
    n,
    monthlyRate,
    totalInterest: pi * n - principal,
    totalCost: total * n,
  };
}

function buildAmortization(
  principal: number,
  monthlyRate: number,
  pi: number,
  n: number,
) {
  const rows: {
    month: number;
    year: number;
    payment: number;
    interest: number;
    principalPaid: number;
    balance: number;
  }[] = [];

  let balance = principal;
  for (let i = 1; i <= n; i++) {
    const interest = balance * monthlyRate;
    const principalPaid = pi - interest;
    balance = Math.max(0, balance - principalPaid);
    rows.push({
      month: i,
      year: Math.ceil(i / 12),
      payment: pi,
      interest,
      principalPaid,
      balance,
    });
  }
  return rows;
}

// ─── Donut Chart ─────────────────────────────────────────────────────────

interface DonutSegment {
  value: number;
  color: string;
  label: string;
  sublabel?: string;
}

/**
 * Smoothly animates an array of numbers toward a target using a per-frame
 * exponential lerp driven by requestAnimationFrame.
 */
function useAnimatedValues(target: number[]): number[] {
  const key = target.join(",");
  const [anim, setAnim] = useState<number[]>(() => target);
  const rafRef = useRef<number | null>(null);
  const animRef = useRef<number[]>(target);
  const targetRef = useRef<number[]>(target);

  useEffect(() => {
    targetRef.current = target;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const EASE = 0.14; // lerp factor per ~16 ms frame (~60 fps feel)

    const tick = () => {
      const cur = animRef.current;
      const tgt = targetRef.current;
      const len = Math.max(cur.length, tgt.length);
      const next = Array.from({ length: len }, (_, i) => {
        const c = cur[i] ?? 0;
        const t = tgt[i] ?? 0;
        return c + (t - c) * EASE;
      });
      animRef.current = next;
      setAnim([...next]);

      const settled = next.every((v, i) => Math.abs(v - (tgt[i] ?? 0)) < 0.01);
      if (!settled) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = [...tgt];
        setAnim([...tgt]);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // key encodes all values — re-run whenever any target value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return anim;
}

/**
 * Convert polar coords (degrees, 0° = 12 o'clock) → Cartesian SVG coords.
 */
function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Build an SVG arc <path> d-attribute string.
 * startDeg: start angle in degrees (0° = top)
 * sweepDeg: arc extent in degrees
 */
function arcPathD(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  sweepDeg: number,
): string {
  if (sweepDeg <= 0) return "";
  const sweep = Math.min(sweepDeg, 359.9999); // avoid full-circle SVG degenerate
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, startDeg + sweep);
  return `M ${s.x.toFixed(4)} ${s.y.toFixed(4)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x.toFixed(4)} ${e.y.toFixed(4)}`;
}

/**
 * Animated donut chart — uses path-based arcs and RAF interpolation.
 * No Framer Motion, no CSS transform quirks; animates reliably on every
 * value change including segment add/remove.
 */
function DonutChart({
  segments,
  total,
  center,
}: {
  segments: DonutSegment[];
  total: number;
  center: React.ReactNode;
}) {
  const R = 80;
  const SW = 20;
  const SIZE = 220;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const GAP = 1.8; // degrees of gap between segments

  // Target sweep angles
  const targetSweeps = segments.map((seg) =>
    total > 0 ? Math.max(0, (seg.value / total) * 360 - GAP) : 0,
  );

  // Smoothly animated sweep angles via RAF
  const sweeps = useAnimatedValues(targetSweeps);

  // Compute cumulative start angles from animated sweeps
  const startAngles: number[] = [];
  let cursor = 0;
  for (let i = 0; i < segments.length; i++) {
    startAngles.push(cursor);
    cursor += (sweeps[i] ?? 0) + GAP;
  }

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ display: "block" }}
        className="drop-shadow-lg"
      >
        {/* track */}
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={SW}
        />
        {segments.map((seg, i) => (
          <path
            key={seg.label}
            d={arcPathD(cx, cy, R, startAngles[i], sweeps[i] ?? 0)}
            fill="none"
            stroke={seg.color}
            strokeWidth={SW}
            strokeLinecap="round"
          />
        ))}
      </svg>
      {/* center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {center}
      </div>
    </div>
  );
}

// ─── Slider ──────────────────────────────────────────────────────────────

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  color = "primary",
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-5 flex items-center group">
      <div className="absolute inset-y-0 flex items-center w-full">
        <div className="relative w-full h-1.5 rounded-full bg-muted">
          <motion.div
            className="absolute left-0 h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="relative w-full h-5 opacity-0 cursor-pointer z-10"
        style={{ margin: 0 }}
      />
      {/* thumb */}
      <motion.div
        className="absolute pointer-events-none w-5 h-5 rounded-full bg-primary border-2 border-white shadow-lg shadow-primary/40"
        style={{ left: `calc(${pct}% - 10px)` }}
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

// ─── Number Input ─────────────────────────────────────────────────────────

function NumericInput({
  value,
  onChange,
  prefix,
  suffix,
  className,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  className?: string;
  min?: number;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(Math.max(min, n));
    else if (raw === "" || raw === ".") onChange(min);
  };

  return (
    <div
      className={cn(
        "flex items-center h-12 rounded-xl border border-input bg-background px-3 gap-1.5 focus-within:ring-2 focus-within:ring-ring transition-shadow",
        className,
      )}
    >
      {prefix && (
        <span className="text-sm text-muted-foreground shrink-0">{prefix}</span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={value === 0 ? "" : fmtNum(value)}
        onChange={handleChange}
        className="flex-1 text-sm font-semibold bg-transparent outline-none min-w-0"
        placeholder="0"
      />
      {suffix && (
        <span className="text-sm text-muted-foreground shrink-0">{suffix}</span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

const CalculatorPage = () => {
  const [searchParams] = useSearchParams();

  // ── Inputs ──
  const [calcType, setCalcType] = useState<CalcType>(
    (searchParams.get("type") as CalcType) === "refinance"
      ? "refinance"
      : "purchase",
  );

  // Sync calcType if the URL param changes (e.g. user clicks nav link again)
  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "refinance" || t === "purchase") setCalcType(t);
  }, [searchParams]);
  const [loanType, setLoanType] = useState<LoanType>("conventional");
  const [homePrice, setHomePrice] = useState(650_000);
  const [downPct, setDownPct] = useState(5);
  const [term, setTerm] = useState<Term>(30);
  const [rate, setRate] = useState(6.5);
  const [annualTaxes, setAnnualTaxes] = useState(8_125);
  const [taxPct, setTaxPct] = useState(1.25);
  const [annualIns, setAnnualIns] = useState(1_300);
  const [insPct, setInsPct] = useState(0.2);
  const [monthlyHOA, setMonthlyHOA] = useState(0);
  const [otherAnnual, setOtherAnnual] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "amortization">(
    "details",
  );

  // ── Derived ──
  const downPayment = (homePrice * downPct) / 100;

  // Sync tax pct / dollar & ins pct / dollar
  const handleHomePriceChange = useCallback(
    (v: number) => {
      setHomePrice(v);
      setAnnualTaxes(Math.round((v * taxPct) / 100));
      setAnnualIns(Math.round((v * insPct) / 100));
    },
    [taxPct, insPct],
  );

  const handleTaxPct = (v: number) => {
    setTaxPct(v);
    setAnnualTaxes(Math.round((homePrice * v) / 100));
  };
  const handleTaxDollar = (v: number) => {
    setAnnualTaxes(v);
    setTaxPct(
      homePrice > 0 ? parseFloat(((v / homePrice) * 100).toFixed(2)) : 0,
    );
  };
  const handleInsPct = (v: number) => {
    setInsPct(v);
    setAnnualIns(Math.round((homePrice * v) / 100));
  };
  const handleInsDollar = (v: number) => {
    setAnnualIns(v);
    setInsPct(
      homePrice > 0 ? parseFloat(((v / homePrice) * 100).toFixed(2)) : 0,
    );
  };

  // ── Calculation ──
  const calc = useMemo(
    () =>
      calcMortgage(
        homePrice,
        downPayment,
        rate,
        term,
        annualTaxes,
        annualIns,
        monthlyHOA,
        otherAnnual,
      ),
    [
      homePrice,
      downPayment,
      rate,
      term,
      annualTaxes,
      annualIns,
      monthlyHOA,
      otherAnnual,
    ],
  );

  const amortization = useMemo(
    () => buildAmortization(calc.principal, calc.monthlyRate, calc.pi, calc.n),
    [calc.principal, calc.monthlyRate, calc.pi, calc.n],
  );

  // ── Donut segments ──
  const segments: DonutSegment[] = [
    {
      value: calc.pi,
      color: "hsl(352, 91%, 54%)",
      label: "P&I",
      sublabel: fmt(calc.pi),
    },
    {
      value: calc.monthlyTax,
      color: "hsl(0,0%,30%)",
      label: "Taxes",
      sublabel: fmt(calc.monthlyTax),
    },
    {
      value: calc.monthlyIns,
      color: "hsl(0,0%,55%)",
      label: "Ins.",
      sublabel: fmt(calc.monthlyIns),
    },
    ...(calc.pmi > 0
      ? [
          {
            value: calc.pmi,
            color: "hsl(352,91%,80%)",
            label: "PMI",
            sublabel: fmt(calc.pmi),
          },
        ]
      : []),
    ...(calc.monthlyHOA > 0
      ? [
          {
            value: calc.monthlyHOA,
            color: "hsl(220,80%,60%)",
            label: "HOA",
            sublabel: fmt(calc.monthlyHOA),
          },
        ]
      : []),
  ];

  const segTotal = segments.reduce((s, x) => s + x.value, 0);

  // Amortization by year summary
  const byYear = useMemo(() => {
    const map = new Map<
      number,
      { interest: number; principal: number; balance: number }
    >();
    for (const r of amortization) {
      const cur = map.get(r.year) ?? { interest: 0, principal: 0, balance: 0 };
      map.set(r.year, {
        interest: cur.interest + r.interest,
        principal: cur.principal + r.principalPaid,
        balance: r.balance,
      });
    }
    return Array.from(map.entries()).map(([year, v]) => ({ year, ...v }));
  }, [amortization]);

  const annualMax =
    byYear.length > 0
      ? Math.max(...byYear.map((r) => r.interest + r.principal))
      : 1;

  // ── Reset ──
  const handleReset = () => {
    setHomePrice(650_000);
    setDownPct(5);
    setTerm(30);
    setRate(6.5);
    setAnnualTaxes(8_125);
    setTaxPct(1.25);
    setAnnualIns(1_300);
    setInsPct(0.2);
    setMonthlyHOA(0);
    setOtherAnnual(0);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <CalcIcon className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Calculator</h1>
          </div>
          <p className="text-muted-foreground">
            Estimate your monthly mortgage payment in real time.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="rounded-xl gap-2 flex"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* ── LEFT: Inputs ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-6"
        >
          {/* Calculator type */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Calculator Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    v: "purchase",
                    label: "New Purchase",
                    icon: <Home className="h-4 w-4" />,
                  },
                  {
                    v: "refinance",
                    label: "Refinance",
                    icon: <RefreshCw className="h-4 w-4" />,
                  },
                ] as const
              ).map(({ v, label, icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalcType(v)}
                  className={cn(
                    "h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-semibold transition-all",
                    calcType === v
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/30"
                      : "border-muted hover:border-primary/40 text-muted-foreground",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Loan type */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Loan Type
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { v: "conventional", label: "Conventional" },
                  { v: "fha", label: "FHA" },
                  { v: "va", label: "VA" },
                  { v: "jumbo", label: "Jumbo" },
                ] as const
              ).map(({ v, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setLoanType(v)}
                  className={cn(
                    "h-11 rounded-xl border-2 text-sm font-semibold transition-all",
                    loanType === v
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted hover:border-primary/30 text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Home price */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Home Price
              </p>
              <motion.span
                key={homePrice}
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-sm font-bold text-primary"
              >
                {fmt(homePrice)}
              </motion.span>
            </div>
            <NumericInput
              value={homePrice}
              onChange={handleHomePriceChange}
              prefix="$"
            />
            <Slider
              value={homePrice}
              min={50_000}
              max={3_000_000}
              step={5_000}
              onChange={handleHomePriceChange}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
              <span>$50K</span>
              <span>$3M</span>
            </div>
          </div>

          {/* Down payment */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Down Payment
              </p>
              {calc.ltv > 0.8 && (
                <Badge
                  variant="outline"
                  className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/5"
                >
                  PMI applies
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumericInput
                value={downPayment}
                onChange={(v) =>
                  setDownPct(
                    Math.min(
                      100,
                      parseFloat(((v / homePrice) * 100).toFixed(2)),
                    ),
                  )
                }
                prefix="$"
              />
              <NumericInput
                value={downPct}
                onChange={(v) => setDownPct(Math.min(100, v))}
                suffix="% down"
              />
            </div>
            <Slider
              value={downPct}
              min={0}
              max={50}
              step={0.5}
              onChange={(v) => setDownPct(v)}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
              <span>0%</span>
              <span className="text-emerald-600 font-semibold">20% no PMI</span>
              <span>50%</span>
            </div>
          </div>

          {/* Term & Rate */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Mortgage Term & Rate
            </p>
            <div className="grid grid-cols-5 gap-2">
              {([10, 15, 20, 25, 30] as Term[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  className={cn(
                    "h-11 rounded-xl border-2 text-sm font-bold transition-all",
                    term === t
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/30"
                      : "border-muted hover:border-primary/30 text-muted-foreground",
                  )}
                >
                  {t}yr
                </button>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  Interest Rate
                </span>
                <motion.span
                  key={rate}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-sm font-bold text-primary"
                >
                  {rate.toFixed(2)}%
                </motion.span>
              </div>
              <NumericInput
                value={rate}
                onChange={(v) => setRate(Math.max(0.1, Math.min(20, v)))}
                suffix="% annual"
              />
              <div className="mt-3">
                <Slider
                  value={rate}
                  min={0.5}
                  max={15}
                  step={0.05}
                  onChange={(v) => setRate(v)}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium mt-1">
                  <span>0.5%</span>
                  <span>15%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-lg transition-colors",
                    showAdvanced ? "bg-primary text-white" : "bg-muted",
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-bold">Advanced Options</span>
              </div>
              <motion.div
                animate={{ rotate: showAdvanced ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-5 border-t">
                    {/* Annual Taxes */}
                    <div className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Annual Property Taxes
                        </p>
                        <span className="text-xs font-bold text-primary">
                          {fmt(annualTaxes / 12)}/mo
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <NumericInput
                          value={annualTaxes}
                          onChange={handleTaxDollar}
                          prefix="$"
                        />
                        <NumericInput
                          value={taxPct}
                          onChange={handleTaxPct}
                          suffix="% / yr"
                        />
                      </div>
                      <Slider
                        value={taxPct}
                        min={0}
                        max={4}
                        step={0.05}
                        onChange={handleTaxPct}
                      />
                    </div>

                    {/* Annual Insurance */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Homeowners Insurance
                        </p>
                        <span className="text-xs font-bold text-primary">
                          {fmt(annualIns / 12)}/mo
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <NumericInput
                          value={annualIns}
                          onChange={handleInsDollar}
                          prefix="$"
                        />
                        <NumericInput
                          value={insPct}
                          onChange={handleInsPct}
                          suffix="% / yr"
                        />
                      </div>
                      <Slider
                        value={insPct}
                        min={0}
                        max={2}
                        step={0.01}
                        onChange={handleInsPct}
                      />
                    </div>

                    {/* Monthly HOA */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Monthly HOA
                      </p>
                      <NumericInput
                        value={monthlyHOA}
                        onChange={setMonthlyHOA}
                        prefix="$"
                      />
                      <Slider
                        value={monthlyHOA}
                        min={0}
                        max={2_000}
                        step={25}
                        onChange={setMonthlyHOA}
                      />
                    </div>

                    {/* Other Annual Expenses */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Other Annual Expenses
                      </p>
                      <NumericInput
                        value={otherAnnual}
                        onChange={setOtherAnnual}
                        prefix="$"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── RIGHT: Results ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-5"
        >
          {/* Monthly Payment Card */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            {/* Red accent */}
            <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

            {/* Tabs */}
            <div className="flex border-b">
              {(
                [
                  {
                    v: "details",
                    label: "Details",
                    icon: <PieChart className="h-3.5 w-3.5" />,
                  },
                  {
                    v: "amortization",
                    label: "Amortization",
                    icon: <BarChart3 className="h-3.5 w-3.5" />,
                  },
                ] as const
              ).map(({ v, label, icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setActiveTab(v)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-all",
                    activeTab === v
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "details" ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 space-y-6"
                >
                  {/* Donut + total */}
                  <div className="flex flex-col items-center">
                    <DonutChart
                      segments={segments}
                      total={segTotal}
                      center={
                        <div className="text-center">
                          <motion.p
                            key={Math.round(calc.total)}
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className="text-3xl font-extrabold leading-none"
                          >
                            {fmt(calc.total)}
                          </motion.p>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            /month
                          </p>
                        </div>
                      }
                    />
                  </div>

                  {/* Legend breakdown */}
                  <div className="space-y-2">
                    {segments.map((seg) => (
                      <div
                        key={seg.label}
                        className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ background: seg.color }}
                          />
                          <span className="text-sm font-medium">
                            {seg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {segTotal > 0
                              ? ((seg.value / segTotal) * 100).toFixed(1)
                              : 0}
                            %
                          </span>
                          <span className="text-sm font-bold">
                            {fmt(seg.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Divider stats */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[
                      {
                        label: "Loan Amount",
                        value: fmt(calc.principal),
                        icon: <DollarSign className="h-4 w-4 text-primary" />,
                      },
                      {
                        label: "Down Payment",
                        value: fmt(downPayment),
                        icon: <Percent className="h-4 w-4 text-emerald-500" />,
                      },
                      {
                        label: "Total Interest",
                        value: fmt(calc.totalInterest),
                        icon: (
                          <TrendingDown className="h-4 w-4 text-amber-500" />
                        ),
                      },
                      {
                        label: "Total Cost",
                        value: fmt(calc.totalCost),
                        icon: <CalcIcon className="h-4 w-4 text-blue-500" />,
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl border bg-muted/20 p-3 space-y-1"
                      >
                        <div className="flex items-center gap-1.5">
                          {s.icon}
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {s.label}
                          </span>
                        </div>
                        <motion.p
                          key={s.value}
                          initial={{ opacity: 0.5, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm font-bold"
                        >
                          {s.value}
                        </motion.p>
                      </div>
                    ))}
                  </div>

                  {/* LTV badge */}
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 border text-sm",
                      calc.ltv <= 0.8
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700"
                        : "bg-amber-500/5 border-amber-500/20 text-amber-700",
                    )}
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    <div>
                      <span className="font-bold">
                        LTV: {(calc.ltv * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs ml-2 opacity-80">
                        {calc.ltv <= 0.8
                          ? "Excellent — no PMI required"
                          : `PMI ~${fmt(calc.pmi)}/mo until 80% LTV`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="amortization"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="p-5 space-y-4"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Payment Breakdown by Year
                  </p>

                  {/* Bar chart */}
                  <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                    {byYear.map((row, i) => (
                      <motion.div
                        key={row.year}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.015 }}
                        className="flex items-center gap-3 group"
                      >
                        <span className="text-xs text-muted-foreground w-8 shrink-0 font-mono">
                          Y{row.year}
                        </span>
                        <div className="flex-1 flex rounded-lg overflow-hidden h-6 bg-muted/40">
                          {/* Principal */}
                          <motion.div
                            className="bg-primary h-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(row.principal / annualMax) * 100}%`,
                            }}
                            transition={{ delay: i * 0.015, duration: 0.5 }}
                            title={`Principal: ${fmt(row.principal)}`}
                          />
                          {/* Interest */}
                          <motion.div
                            className="bg-muted-foreground/30 h-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(row.interest / annualMax) * 100}%`,
                            }}
                            transition={{ delay: i * 0.015, duration: 0.5 }}
                            title={`Interest: ${fmt(row.interest)}`}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground w-20 text-right shrink-0 font-mono">
                          {fmt(row.balance, 0)}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
                      Principal
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />
                      Interest
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Balance remaining
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="rounded-xl border bg-muted/20 p-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">
                        Total Principal
                      </p>
                      <p className="font-bold text-primary">
                        {fmt(calc.principal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">
                        Total Interest Paid
                      </p>
                      <p className="font-bold text-amber-600">
                        {fmt(calc.totalInterest)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <Shield className="h-4 w-4" />, label: "Secure" },
              { icon: <Info className="h-4 w-4" />, label: "Estimate Only" },
              { icon: <Sparkles className="h-4 w-4" />, label: "Real-time" },
            ].map((b) => (
              <div
                key={b.label}
                className="flex flex-col items-center gap-1 rounded-xl border bg-muted/20 py-3 text-xs text-muted-foreground font-medium"
              >
                {b.icon}
                {b.label}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold">Ready to apply?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Start your mortgage application today.
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-xl shrink-0 shadow-lg shadow-primary/25"
              onClick={() => (window.location.href = "/apply")}
            >
              Apply Now
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CalculatorPage;
