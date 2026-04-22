import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Edit2,
  Check,
  X,
  RefreshCw,
  Globe,
  User,
  Users,
  ChevronDown,
  Zap,
  Award,
  BarChart3,
  FileCheck,
  Home,
  CalendarDays,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBrokerMetrics,
  updateBrokerMetrics,
  fetchAnnualMetrics,
} from "@/store/slices/dashboardSlice";
import { fetchBrokers } from "@/store/slices/brokersSlice";
import LeadSourceClientsDrawer from "@/components/LeadSourceClientsDrawer";
import type {
  BrokerMonthlyMetrics,
  UpdateBrokerMetricsRequest,
} from "@shared/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SOURCE_LABELS: Record<string, string> = {
  current_client_referral: "Current Client Referral",
  past_client: "Past Client",
  past_client_referral: "Past Client Referral",
  personal_friend: "Personal Friend",
  realtor: "Realtor",
  advertisement: "Advertisement",
  business_partner: "Business Partner",
  builder: "Builder",
  public_wizard: "Public Wizard",
  other: "Other",
};
const SOURCE_CODES: Record<string, string> = {
  current_client_referral: "CCR",
  past_client: "PC",
  past_client_referral: "PR",
  personal_friend: "PF",
  realtor: "RLTR",
  advertisement: "AD",
  business_partner: "BUS",
  builder: "BLDR",
  public_wizard: "PW",
  other: "—",
};
const ALL_SOURCES = Object.keys(SOURCE_LABELS);

const PIE_COLORS = [
  "hsl(352, 91%, 54%)",
  "hsl(352, 70%, 45%)",
  "hsl(25, 95%, 53%)",
  "hsl(45, 93%, 47%)",
  "hsl(160, 84%, 39%)",
  "hsl(200, 98%, 39%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 81%, 60%)",
  "hsl(0, 0%, 60%)",
];

const POLL_INTERVAL_MS = 60_000; // 60s auto-refresh

// ─── Sub-components ──────────────────────────────────────────────────────────

function EditableCell({
  value,
  onSave,
  isPercent = false,
  className,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  isPercent?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  const commit = () => {
    const parsed = draft.trim() === "" ? null : parseFloat(draft);
    if (draft.trim() !== "" && isNaN(parsed!)) {
      setDraft(String(value ?? ""));
      setEditing(false);
      return;
    }
    onSave(parsed);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(String(value ?? ""));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-center">
        <Input
          className="h-6 w-20 text-xs p-1 text-center"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
        />
        <button onClick={commit} className="text-primary hover:text-primary/80">
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={cancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => {
        setDraft(String(value ?? ""));
        setEditing(true);
      }}
      className={cn(
        "group flex items-center gap-1 hover:text-primary transition-colors",
        className,
      )}
    >
      <span>{value != null ? (isPercent ? `${value}%` : value) : "—"}</span>
      <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  );
}

function KpiCard({
  icon,
  label,
  actual,
  goal,
  onSaveGoal,
  onSaveActual,
  isPartner,
  accentColor = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  actual: number;
  goal: number;
  onSaveGoal?: (v: number | null) => void;
  onSaveActual?: (v: number | null) => void;
  isPartner?: boolean;
  accentColor?: "primary" | "emerald" | "amber" | "sky";
}) {
  const pct = goal > 0 ? Math.min(Math.round((actual / goal) * 100), 100) : 0;
  const over = actual >= goal;
  const delta = actual - goal;

  const barColor = {
    primary: "bg-primary",
    emerald: "bg-emerald-500",
    amber: "bg-amber-400",
    sky: "bg-sky-500",
  }[accentColor];
  const iconBg = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-400/10 text-amber-600",
    sky: "bg-sky-500/10 text-sky-600",
  }[accentColor];
  const glowColor = {
    primary: "bg-primary",
    emerald: "bg-emerald-400",
    amber: "bg-amber-300",
    sky: "bg-sky-400",
  }[accentColor];

  return (
    <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm overflow-hidden">
      <div
        className={cn(
          "pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-10 blur-2xl",
          glowColor,
        )}
      />
      <div className="flex items-start justify-between">
        <div className={cn("rounded-lg p-2", iconBg)}>{icon}</div>
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs font-semibold",
            over ? "text-emerald-500" : "text-destructive",
          )}
        >
          {over ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {delta >= 0 ? `+${delta}` : delta}
        </span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          {onSaveActual && !isPartner ? (
            <span className="text-2xl font-extrabold leading-none">
              <EditableCell
                value={actual}
                onSave={onSaveActual}
                className="text-2xl font-extrabold"
              />
            </span>
          ) : (
            <span className="text-2xl font-extrabold leading-none">
              {actual}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            /{" "}
            {onSaveGoal && !isPartner ? (
              <EditableCell value={goal} onSave={onSaveGoal} />
            ) : (
              <span className="text-amber-500 font-semibold">{goal}</span>
            )}
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-right -mt-1">
        {pct}% of goal
      </p>
    </div>
  );
}

function RateCard({
  label,
  actual,
  goal,
  onSaveGoal,
  isPartner,
}: {
  label: string;
  actual: number;
  goal: number;
  onSaveGoal?: (v: number | null) => void;
  isPartner?: boolean;
}) {
  const over = actual >= goal;
  return (
    <div className="relative flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card p-4 shadow-sm text-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <span
        className={cn(
          "text-3xl font-extrabold",
          over ? "text-emerald-500" : "text-primary",
        )}
      >
        {actual}%
      </span>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
        {label}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[10px] text-muted-foreground">Goal:</span>
        {onSaveGoal && !isPartner ? (
          <span className="text-[11px] font-bold text-amber-500">
            <EditableCell value={goal} onSave={onSaveGoal} />
          </span>
        ) : (
          <span className="text-[11px] font-bold text-amber-500">{goal}%</span>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium",
          over ? "text-emerald-500" : "text-destructive",
        )}
      >
        {over ? "✓ On Track" : "↓ Below Goal"}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BrokerMetricsPanelProps {
  year?: number;
  month?: number;
  isPartner?: boolean;
}

const BrokerMetricsPanel: React.FC<BrokerMetricsPanelProps> = ({
  year: propYear,
  month: propMonth,
  isPartner = false,
}) => {
  const dispatch = useAppDispatch();
  const {
    brokerMetrics: metrics,
    metricsLoading,
    metricsError,
    annualMetrics,
    annualLoading,
  } = useAppSelector((state) => state.dashboard);
  const { brokers } = useAppSelector((state) => state.brokers);

  const [selectedBrokerIds, setSelectedBrokerIds] = useState<number[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("monthly");
  const [drawerSource, setDrawerSource] = useState<{
    key: string;
    label: string;
    code: string;
    count: number;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const now = new Date();
  const year = propYear ?? now.getFullYear();
  const month = propMonth ?? now.getMonth() + 1;

  useEffect(() => {
    if (!isPartner && brokers.length === 0) dispatch(fetchBrokers({}));
  }, [isPartner, brokers.length, dispatch]);

  const load = useCallback(
    (ids: number[]) => {
      dispatch(fetchBrokerMetrics({ year, month, filterBrokerIds: ids }));
      dispatch(fetchAnnualMetrics({ year, filterBrokerIds: ids }));
    },
    [dispatch, year, month],
  );

  // Initial load
  useEffect(() => {
    load(selectedBrokerIds);
  }, [load]);

  // Auto-polling every 60s
  useEffect(() => {
    pollRef.current = setInterval(
      () => load(selectedBrokerIds),
      POLL_INTERVAL_MS,
    );
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load, selectedBrokerIds]);

  const save = useCallback(
    (patch: Partial<UpdateBrokerMetricsRequest>) => {
      dispatch(updateBrokerMetrics({ year, month, ...patch }));
    },
    [dispatch, year, month],
  );

  const toggleBroker = (id: number) => {
    setSelectedBrokerIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      load(next);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedBrokerIds([]);
    load([]);
  };
  const refresh = () => load(selectedBrokerIds);

  // ── Derived data ──────────────────────────────────────────────────────────

  const m: BrokerMonthlyMetrics = metrics ?? {
    year,
    month,
    lead_to_credit_goal: 70,
    credit_to_preapp_goal: 50,
    lead_to_closing_goal: 25,
    leads_goal: 40,
    credit_pulls_goal: 28,
    closings_goal: 10,
    leads_actual: 0,
    credit_pulls_actual: 0,
    pre_approvals_actual: 0,
    closings_actual: 0,
    prev_year_leads: null,
    prev_year_closings: null,
    lead_sources: [],
  };

  const monthName = MONTH_NAMES_FULL[m.month - 1];
  // Lead source table uses annual data so loans from any month of the year are included
  const annualSourceData = annualMetrics?.lead_sources_annual ?? m.lead_sources;
  const sourceMap = new Map(annualSourceData.map((s) => [s.category, s.count]));
  const totalLeadsFromSources = ALL_SOURCES.reduce(
    (s, k) =>
      s + (sourceMap.get(k as import("@shared/api").LeadSourceCategory) ?? 0),
    0,
  );

  const leadToCreditActual =
    m.leads_actual > 0
      ? Math.round((m.credit_pulls_actual / m.leads_actual) * 100)
      : 0;
  const creditToPreappActual =
    m.credit_pulls_actual > 0
      ? Math.round((m.pre_approvals_actual / m.credit_pulls_actual) * 100)
      : 0;
  const leadToClosingActual =
    m.leads_actual > 0
      ? Math.round((m.closings_actual / m.leads_actual) * 100)
      : 0;
  const prevYearLeadToClosing =
    m.prev_year_leads && m.prev_year_leads > 0 && m.prev_year_closings != null
      ? Math.round((m.prev_year_closings / m.prev_year_leads) * 100)
      : null;

  const selectorLabel =
    selectedBrokerIds.length === 0
      ? "All Realtors"
      : selectedBrokerIds.length === 1
        ? (() => {
            const b = brokers.find((b) => b.id === selectedBrokerIds[0]);
            return b ? `${b.first_name} ${b.last_name}` : "1 Realtor";
          })()
        : `${selectedBrokerIds.length} Realtors`;

  // Annual chart data
  const closingsByMonthData = (annualMetrics?.months ?? []).map((s) => ({
    month: MONTH_NAMES[s.month - 1],
    closings: s.closings,
    leads: s.leads,
    goal: s.closings_goal,
  }));

  const conversionTrendData = (annualMetrics?.months ?? []).map((s) => ({
    month: MONTH_NAMES[s.month - 1],
    "Lead→Credit": s.lead_to_credit_pct,
    "Credit→PreApp": s.credit_to_preapp_pct,
    "Lead→Closing": s.lead_to_closing_pct,
  }));

  const pieData = (annualMetrics?.lead_sources_annual ?? m.lead_sources)
    .map((s) => ({
      name: SOURCE_LABELS[s.category] ?? s.category,
      value: s.count,
    }))
    .filter((d) => d.value > 0);

  const funnelData = [
    { name: "Leads", value: m.leads_actual, fill: "hsl(352, 91%, 54%)" },
    {
      name: "Credit Pulls",
      value: m.credit_pulls_actual,
      fill: "hsl(200, 98%, 39%)",
    },
    {
      name: "Pre-Approvals",
      value: m.pre_approvals_actual,
      fill: "hsl(160, 84%, 39%)",
    },
    { name: "Closings", value: m.closings_actual, fill: "hsl(45, 93%, 47%)" },
  ];

  // ── Shared header controls ────────────────────────────────────────────────

  const isAnyLoading = metricsLoading || annualLoading;

  const HeaderControls = (
    <div className="flex items-center gap-2 shrink-0">
      {!isPartner && (
        <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-48 justify-between text-xs font-normal bg-background/80"
            >
              <span className="flex items-center gap-1.5 truncate">
                {selectedBrokerIds.length === 0 ? (
                  <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : selectedBrokerIds.length === 1 ? (
                  <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <span className="truncate">{selectorLabel}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <div className="space-y-0.5">
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors">
                <Checkbox
                  checked={selectedBrokerIds.length === 0}
                  onCheckedChange={selectAll}
                />
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">All Brokers</span>
              </label>
              <div className="border-t my-1" />
              {brokers.map((b) => (
                <label
                  key={b.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={selectedBrokerIds.includes(b.id)}
                    onCheckedChange={() => toggleBroker(b.id)}
                  />
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">
                    {b.first_name} {b.last_name}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0",
                      b.role === "broker"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {b.role === "broker" ? "Partner" : "MB"}
                  </span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isAnyLoading}
            className="h-8 bg-background/80"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isAnyLoading && "animate-spin")}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh metrics</TooltipContent>
      </Tooltip>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <TooltipProvider>
        <Card className="overflow-hidden border-border/60">
          {/* Header */}
          <CardHeader className="pb-4 bg-gradient-to-r from-card to-secondary/30 border-b border-border/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    {selectedBrokerIds.length === 0
                      ? "Performance Metrics"
                      : selectedBrokerIds.length === 1
                        ? (() => {
                            const b = brokers.find(
                              (b) => b.id === selectedBrokerIds[0],
                            );
                            return b
                              ? `${b.first_name} ${b.last_name}`
                              : "Broker";
                          })()
                        : `${selectedBrokerIds.length} Brokers`}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarDays className="h-3 w-3" />
                    {monthName} {m.year}
                    {isAnyLoading && (
                      <Activity className="h-3 w-3 animate-pulse ml-1 text-primary" />
                    )}
                    <span className="ml-1 opacity-50">· auto-refresh 60s</span>
                  </p>
                </div>
              </div>
              {HeaderControls}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-5 pt-4">
                <TabsList className="h-8 text-xs">
                  <TabsTrigger value="monthly" className="text-xs px-3">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="annual" className="text-xs px-3">
                    Annual / Quarterly
                  </TabsTrigger>
                  <TabsTrigger value="charts" className="text-xs px-3">
                    Charts
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── MONTHLY TAB ── */}
              <TabsContent value="monthly" className="p-5 space-y-6 mt-0">
                {/* Conversion Rate Goals */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Conversion Rate Goals
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <RateCard
                      label="Lead → Credit"
                      actual={leadToCreditActual}
                      goal={m.lead_to_credit_goal}
                      onSaveGoal={(v) => save({ lead_to_credit_goal: v ?? 0 })}
                      isPartner={isPartner}
                    />
                    <RateCard
                      label="Credit → Pre-App"
                      actual={creditToPreappActual}
                      goal={m.credit_to_preapp_goal}
                      onSaveGoal={(v) =>
                        save({ credit_to_preapp_goal: v ?? 0 })
                      }
                      isPartner={isPartner}
                    />
                    <RateCard
                      label="Lead → Closing"
                      actual={leadToClosingActual}
                      goal={m.lead_to_closing_goal}
                      onSaveGoal={(v) => save({ lead_to_closing_goal: v ?? 0 })}
                      isPartner={isPartner}
                    />
                  </div>
                </section>

                {/* KPI Cards */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Monthly Actuals vs Goals
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KpiCard
                      icon={<Users className="h-4 w-4" />}
                      label="Leads"
                      actual={m.leads_actual}
                      goal={m.leads_goal}
                      onSaveGoal={(v) => save({ leads_goal: v ?? 0 })}
                      isPartner={isPartner}
                      accentColor="primary"
                    />
                    <KpiCard
                      icon={<Zap className="h-4 w-4" />}
                      label="Credit Pulls"
                      actual={m.credit_pulls_actual}
                      goal={m.credit_pulls_goal}
                      onSaveGoal={(v) => save({ credit_pulls_goal: v ?? 0 })}
                      onSaveActual={(v) =>
                        save({ credit_pulls_actual: v ?? 0 })
                      }
                      isPartner={isPartner}
                      accentColor="sky"
                    />
                    <KpiCard
                      icon={<FileCheck className="h-4 w-4" />}
                      label="Pre-Approvals"
                      actual={m.pre_approvals_actual}
                      goal={Math.round(
                        (m.leads_goal * m.credit_to_preapp_goal) / 100,
                      )}
                      isPartner={isPartner}
                      accentColor="emerald"
                    />
                    <KpiCard
                      icon={<Home className="h-4 w-4" />}
                      label="Closings"
                      actual={m.closings_actual}
                      goal={m.closings_goal}
                      onSaveGoal={(v) => save({ closings_goal: v ?? 0 })}
                      isPartner={isPartner}
                      accentColor="amber"
                    />
                  </div>
                </section>

                {/* Conversion Funnel */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Conversion Funnel — {monthName}
                    </h3>
                  </div>
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="flex items-stretch divide-x divide-border">
                      {funnelData.map((stage, i) => {
                        const pct =
                          i === 0
                            ? 100
                            : funnelData[0].value > 0
                              ? Math.round(
                                  (stage.value / funnelData[0].value) * 100,
                                )
                              : 0;
                        return (
                          <div
                            key={stage.name}
                            className="flex-1 flex flex-col items-center justify-center py-5 px-2 text-center gap-1 relative"
                          >
                            <div
                              className="pointer-events-none absolute inset-0 opacity-5"
                              style={{ background: stage.fill }}
                            />
                            <span
                              className="text-2xl font-extrabold"
                              style={{ color: stage.fill }}
                            >
                              {stage.value}
                            </span>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
                              {stage.name}
                            </span>
                            {i > 0 && (
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: stage.fill }}
                              >
                                {pct}% of leads
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* progress bar strip under each stage */}
                    <div className="flex h-1.5">
                      {funnelData.map((stage, i) => {
                        const pct =
                          funnelData[0].value > 0
                            ? Math.min(
                                (stage.value / funnelData[0].value) * 100,
                                100,
                              )
                            : 0;
                        return (
                          <div
                            key={stage.name}
                            className="flex-1 bg-muted overflow-hidden"
                          >
                            <div
                              className="h-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: stage.fill,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Previous Year */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Previous Year Data ({m.year - 1})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
                        {m.year - 1} Leads
                      </p>
                      <div className="text-xl font-extrabold">
                        {!isPartner ? (
                          <EditableCell
                            value={m.prev_year_leads}
                            onSave={(v) => save({ prev_year_leads: v })}
                          />
                        ) : (
                          <span>{m.prev_year_leads ?? "—"}</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
                        {m.year - 1} Closings
                      </p>
                      <div className="text-xl font-extrabold">
                        {!isPartner ? (
                          <EditableCell
                            value={m.prev_year_closings}
                            onSave={(v) => save({ prev_year_closings: v })}
                          />
                        ) : (
                          <span>{m.prev_year_closings ?? "—"}</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
                        {m.year - 1} Close Rate
                      </p>
                      <span
                        className={cn(
                          "text-xl font-extrabold",
                          prevYearLeadToClosing != null
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {prevYearLeadToClosing != null
                          ? `${prevYearLeadToClosing}%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Lead Source Table */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Lead Source Analysis
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Total:{" "}
                      <strong className="text-foreground">
                        {totalLeadsFromSources}
                      </strong>
                    </span>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[360px] text-sm">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border">
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap w-16">
                              Code
                            </th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Source
                            </th>
                            <th className="px-3 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap w-16">
                              Count
                            </th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap w-16">
                              Share
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ALL_SOURCES.map((key, i) => {
                            const count =
                              sourceMap.get(
                                key as import("@shared/api").LeadSourceCategory,
                              ) ?? 0;
                            const share =
                              totalLeadsFromSources > 0
                                ? Math.round(
                                    (count / totalLeadsFromSources) * 100,
                                  )
                                : 0;
                            return (
                              <tr
                                key={key}
                                onClick={() =>
                                  count > 0 &&
                                  setDrawerSource({
                                    key,
                                    label: SOURCE_LABELS[key],
                                    code: SOURCE_CODES[key],
                                    count,
                                  })
                                }
                                className={cn(
                                  "border-b border-border/40 transition-colors hover:bg-accent/40",
                                  i % 2 === 1 && "bg-muted/20",
                                  count > 0 && "cursor-pointer",
                                )}
                              >
                                <td className="px-3 py-2.5">
                                  <span className="inline-block whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                    {SOURCE_CODES[key]}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-sm text-foreground/80">
                                  {SOURCE_LABELS[key]}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={cn(
                                      "font-bold text-sm",
                                      count > 0
                                        ? "text-foreground"
                                        : "text-muted-foreground/50",
                                    )}
                                  >
                                    {count}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  {count > 0 ? (
                                    <span className="text-xs font-semibold text-primary">
                                      {share}%
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/40">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </TabsContent>

              {/* ── CHARTS TAB ── */}
              <TabsContent value="charts" className="p-5 space-y-8 mt-0">
                {/* Closings by Month */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Home className="h-4 w-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Closings by Month — {year}
                    </h3>
                  </div>
                  <ChartContainer
                    config={{
                      closings: {
                        label: "Closings",
                        color: "hsl(352, 91%, 54%)",
                      },
                      goal: { label: "Goal", color: "hsl(45, 93%, 47%)" },
                      leads: { label: "Leads", color: "hsl(200, 98%, 39%)" },
                    }}
                    className="h-60 w-full"
                  >
                    <BarChart
                      data={closingsByMonthData}
                      margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/30"
                      />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="leads"
                        fill="var(--color-leads)"
                        radius={[3, 3, 0, 0]}
                        opacity={0.4}
                      />
                      <Bar
                        dataKey="closings"
                        fill="var(--color-closings)"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="goal"
                        fill="var(--color-goal)"
                        radius={[3, 3, 0, 0]}
                        opacity={0.35}
                      />
                    </BarChart>
                  </ChartContainer>
                  <div className="flex justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary/40" />
                      Leads
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary" />
                      Closings
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400/40" />
                      Goal
                    </span>
                  </div>
                </section>

                {/* Conversion Trend */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Conversion Rate Trends — {year}
                    </h3>
                  </div>
                  <ChartContainer
                    config={{
                      "Lead→Credit": {
                        label: "Lead→Credit",
                        color: "hsl(352, 91%, 54%)",
                      },
                      "Credit→PreApp": {
                        label: "Credit→PreApp",
                        color: "hsl(160, 84%, 39%)",
                      },
                      "Lead→Closing": {
                        label: "Lead→Closing",
                        color: "hsl(45, 93%, 47%)",
                      },
                    }}
                    className="h-60 w-full"
                  >
                    <LineChart
                      data={conversionTrendData}
                      margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/30"
                      />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="Lead→Credit"
                        stroke="var(--color-Lead→Credit)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Credit→PreApp"
                        stroke="var(--color-Credit→PreApp)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Lead→Closing"
                        stroke="var(--color-Lead→Closing)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </section>

                {/* Lead Source Pie */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Lead Source Distribution — {year}
                    </h3>
                  </div>
                  {pieData.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No lead source data yet.
                    </p>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ChartContainer
                        config={{}}
                        className="h-52 w-52 shrink-0 aspect-square"
                      >
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={78}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((_, i) => (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[i % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <ChartTooltip
                            content={<ChartTooltipContent nameKey="name" />}
                          />
                        </PieChart>
                      </ChartContainer>
                      <ul className="flex-1 space-y-1.5 text-xs">
                        {pieData.map((d, i) => {
                          const total = pieData.reduce(
                            (s, x) => s + x.value,
                            0,
                          );
                          return (
                            <li
                              key={d.name}
                              className="flex items-center gap-2"
                            >
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  background: PIE_COLORS[i % PIE_COLORS.length],
                                }}
                              />
                              <span className="flex-1 text-foreground/80">
                                {d.name}
                              </span>
                              <span className="font-bold text-foreground">
                                {d.value}
                              </span>
                              <span className="text-muted-foreground w-8 text-right">
                                {Math.round((d.value / total) * 100)}%
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </section>
              </TabsContent>

              {/* ── ANNUAL / QUARTERLY TAB ── */}
              <TabsContent value="annual" className="p-5 space-y-6 mt-0">
                {annualLoading && !annualMetrics ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading annual data…
                  </div>
                ) : (
                  <>
                    {/* Annual KPI strip */}
                    {annualMetrics && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="h-4 w-4 text-primary" />
                          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Year {year} Totals
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            {
                              label: "Annual Leads",
                              value: annualMetrics.annual_leads,
                              color: "text-primary",
                            },
                            {
                              label: "Annual Credit Pulls",
                              value: annualMetrics.annual_credit_pulls,
                              color: "text-sky-500",
                            },
                            {
                              label: "Annual Pre-Approvals",
                              value: annualMetrics.annual_pre_approvals,
                              color: "text-emerald-500",
                            },
                            {
                              label: "Annual Closings",
                              value: annualMetrics.annual_closings,
                              color: "text-amber-500",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1"
                            >
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
                                {item.label}
                              </p>
                              <span
                                className={cn(
                                  "text-2xl font-extrabold",
                                  item.color,
                                )}
                              >
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-3">
                          {[
                            {
                              label: "Avg Lead→Credit",
                              value: annualMetrics.avg_lead_to_credit_pct,
                            },
                            {
                              label: "Avg Credit→Pre-App",
                              value: annualMetrics.avg_credit_to_preapp_pct,
                            },
                            {
                              label: "Avg Lead→Closing",
                              value: annualMetrics.avg_lead_to_closing_pct,
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-2"
                            >
                              <span className="text-xs text-muted-foreground">
                                {item.label}
                              </span>
                              <span className="text-lg font-extrabold text-primary">
                                {item.value}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Quarterly breakdown */}
                    {annualMetrics && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Quarterly Summary — {year}
                          </h3>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[480px] text-sm">
                              <thead>
                                <tr className="bg-muted/40 border-b border-border">
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Quarter
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Leads
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Credits
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Pre-Apps
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Closings
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    L→C%
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {annualMetrics.quarters.map((q, i) => (
                                  <tr
                                    key={q.quarter}
                                    className={cn(
                                      "border-b border-border/40 hover:bg-accent/40 transition-colors",
                                      i % 2 === 1 && "bg-muted/20",
                                    )}
                                  >
                                    <td className="px-4 py-3 font-semibold text-foreground">
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                          Q{q.quarter}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {MONTH_NAMES[(q.quarter - 1) * 3]}–
                                          {MONTH_NAMES[q.quarter * 3 - 1]}
                                        </span>
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold">
                                      {q.leads}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-sky-600 dark:text-sky-400">
                                      {q.credit_pulls}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                      {q.pre_approvals}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                                      {q.closings}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={cn(
                                          "text-xs font-bold",
                                          q.avg_lead_to_closing_pct > 0
                                            ? "text-primary"
                                            : "text-muted-foreground/50",
                                        )}
                                      >
                                        {q.avg_lead_to_closing_pct > 0
                                          ? `${q.avg_lead_to_closing_pct}%`
                                          : "—"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Monthly breakdown table */}
                    {annualMetrics && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Month-by-Month Breakdown — {year}
                          </h3>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm">
                              <thead>
                                <tr className="bg-muted/40 border-b border-border">
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Month
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Leads
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Credits
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Pre-Apps
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Closings
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    L→Cl%
                                  </th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Goal
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {annualMetrics.months.map((s, i) => {
                                  const isCurrent = s.month === month;
                                  return (
                                    <tr
                                      key={s.month}
                                      className={cn(
                                        "border-b border-border/40 hover:bg-accent/40 transition-colors",
                                        i % 2 === 1 && "bg-muted/20",
                                        isCurrent &&
                                          "ring-1 ring-inset ring-primary/30 bg-primary/5",
                                      )}
                                    >
                                      <td className="px-4 py-2.5 font-medium text-foreground flex items-center gap-1.5">
                                        {MONTH_NAMES_FULL[s.month - 1]}
                                        {isCurrent && (
                                          <span className="text-[9px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-bold">
                                            NOW
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-center font-semibold">
                                        {s.leads || (
                                          <span className="text-muted-foreground/40">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-center font-semibold text-sky-600 dark:text-sky-400">
                                        {s.credit_pulls || (
                                          <span className="text-muted-foreground/40">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                        {s.pre_approvals || (
                                          <span className="text-muted-foreground/40">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-center font-semibold text-amber-600 dark:text-amber-400">
                                        {s.closings || (
                                          <span className="text-muted-foreground/40">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span
                                          className={cn(
                                            "text-xs font-bold",
                                            s.lead_to_closing_pct > 0
                                              ? "text-primary"
                                              : "text-muted-foreground/40",
                                          )}
                                        >
                                          {s.lead_to_closing_pct > 0
                                            ? `${s.lead_to_closing_pct}%`
                                            : "—"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className="text-xs font-semibold text-amber-500">
                                          {s.closings_goal > 0
                                            ? s.closings_goal
                                            : "—"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </TooltipProvider>

      {drawerSource && (
        <LeadSourceClientsDrawer
          isOpen={drawerSource !== null}
          onClose={() => setDrawerSource(null)}
          sourceKey={drawerSource.key}
          sourceLabel={drawerSource.label}
          sourceCode={drawerSource.code}
          count={drawerSource.count}
        />
      )}
    </>
  );
};

export default BrokerMetricsPanel;
