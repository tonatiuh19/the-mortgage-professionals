import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  X,
  Printer,
  Save,
  FolderOpen,
  Trash2,
  Info,
  Calculator,
  FilePlus2,
  Loader2,
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ClientLinkCombobox,
  type LinkedClientValue,
} from "@/components/ClientLinkCombobox";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  applyCalculatorSaveNote,
  createCalculatorSave,
  fetchClientOpenLoans,
  updateCalculatorSave,
} from "@/store/slices/calculatorSavesSlice";
import { logger } from "@/lib/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import {
  type LoanCalcInputs,
  type LoanCalcKind,
  type LineItem,
  type LoanCalcResult,
  computeLoanCalc,
  fmtMoney,
  fmtPct,
  kindBlurb,
  kindTitle,
  newLineId,
  sumLines,
} from "@shared/loan-calc-engine";
import {
  computeHousehold,
  householdToIncomeLineDrafts,
  type WageEarnerWorksheet as WageWorksheet,
} from "@shared/income-qualify-engine";
import { WageEarnerWorksheet } from "./WageEarnerWorksheet";
import {
  deleteSavedCalculation,
  listSavedCalculations,
  normalizeLoanCalcInputs,
  saveCalculation,
  type SavedLoanCalculation,
} from "./loanCalcStorage";
import { useToast } from "@/hooks/use-toast";

const PIE_COLORS = [
  "hsl(352 91% 54%)",
  "hsl(215 20% 35%)",
  "hsl(40 90% 50%)",
  "hsl(160 50% 40%)",
  "hsl(260 40% 55%)",
];

function MoneyInput({
  label,
  value,
  onChange,
  hint,
  prefix = "$",
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        {hint && (
          <span title={hint}>
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn("h-10", prefix && "pl-7", suffix && "pr-10")}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function LineList({
  title,
  placeholder,
  items,
  onChange,
  addLabel,
  totalLabel,
}: {
  title: string;
  placeholder: string;
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  addLabel: string;
  totalLabel: string;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 space-y-4 print:break-inside-avoid">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((row, idx) => (
          <div key={row.id} className="flex gap-2 items-center">
            <Input
              placeholder={placeholder}
              value={row.label}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...row, label: e.target.value };
                onChange(next);
              }}
              className="h-9 flex-1"
            />
            <div className="relative w-32 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                inputMode="decimal"
                value={row.amount || ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = {
                    ...row,
                    amount: parseFloat(e.target.value) || 0,
                  };
                  onChange(next);
                }}
                className="h-9 pl-6"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 print:hidden"
              onClick={() => onChange(items.filter((i) => i.id !== row.id))}
              disabled={items.length <= 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full print:hidden"
        onClick={() =>
          onChange([
            ...items,
            { id: newLineId("line"), label: "", amount: 0 },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {addLabel}
      </Button>
      <div className="flex justify-between text-sm font-semibold border-t pt-2">
        <span className="text-muted-foreground">{totalLabel}</span>
        <span>{fmtMoney(sumLines(items))}</span>
      </div>
    </section>
  );
}

export function LoanWorksheet({
  kind,
  inputs,
  onChange,
  brokerId,
  linkedClient = null,
  onLinkedClientChange,
  linkedLoanId = null,
  onLinkedLoanIdChange,
  linkedSaveId = null,
  onLinkedSaveIdChange,
  incomeWorksheet,
  onIncomeWorksheetChange,
}: {
  kind: Exclude<LoanCalcKind, "quick_payment">;
  inputs: LoanCalcInputs;
  onChange: (next: LoanCalcInputs) => void;
  brokerId: number | null;
  linkedClient?: LinkedClientValue | null;
  onLinkedClientChange?: (c: LinkedClientValue | null) => void;
  linkedLoanId?: number | null;
  onLinkedLoanIdChange?: (id: number | null) => void;
  linkedSaveId?: number | null;
  onLinkedSaveIdChange?: (id: number | null) => void;
  /** Shared wage-earner worksheet — drives multi-borrower qualifying income. */
  incomeWorksheet?: WageWorksheet;
  onIncomeWorksheetChange?: (next: WageWorksheet) => void;
}) {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { openLoans, isSaving, isApplying } = useAppSelector(
    (s) => s.calculatorSaves,
  );
  const [savesOpen, setSavesOpen] = useState(false);
  const [saves, setSaves] = useState<SavedLoanCalculation[]>(() =>
    listSavedCalculations(brokerId),
  );
  const [incomeOpen, setIncomeOpen] = useState(true);

  useEffect(() => {
    if (linkedClient?.id) {
      void dispatch(fetchClientOpenLoans(linkedClient.id));
    }
  }, [linkedClient?.id, dispatch]);

  const household = useMemo(
    () =>
      incomeWorksheet ? computeHousehold(incomeWorksheet) : null,
    [incomeWorksheet],
  );
  const householdTotal = household?.householdTotal ?? 0;
  const incomeDraftCount = useMemo(
    () =>
      incomeWorksheet
        ? householdToIncomeLineDrafts(incomeWorksheet).length
        : 0,
    [incomeWorksheet],
  );

  const result = useMemo(
    () => computeLoanCalc(kind, inputs),
    [kind, inputs],
  );

  const pieData = useMemo(() => {
    const rows = [
      { name: "P&I", value: result.principalAndInterest },
      { name: "Taxes", value: result.monthlyTax },
      { name: "Insurance", value: result.monthlyInsurance },
      { name: result.miLabel, value: result.monthlyMi },
      { name: "HOA", value: result.monthlyHoa },
    ].filter((r) => r.value > 0.005);
    return rows.length ? rows : [{ name: "No payment yet", value: 1 }];
  }, [result]);

  const ratioBars = result.ratiosAvailable
    ? [
        {
          name: "Front-end",
          value: Math.min(result.frontEndRatio, 100),
          fill:
            result.frontEndRatio > 31
              ? "hsl(0 72% 51%)"
              : result.frontEndRatio > 28
                ? "hsl(40 90% 45%)"
                : "hsl(160 50% 40%)",
        },
        {
          name: "Back-end",
          value: Math.min(result.backEndRatio, 100),
          fill:
            result.backEndRatio > 43
              ? "hsl(0 72% 51%)"
              : result.backEndRatio > 36
                ? "hsl(40 90% 45%)"
                : "hsl(160 50% 40%)",
        },
      ]
    : [];

  const ratioDomainMax = Math.max(
    60,
    ...ratioBars.map((r) => Math.ceil(r.value / 10) * 10),
    0,
  );

  const patch = (partial: Partial<LoanCalcInputs>) =>
    onChange({ ...inputs, ...partial });

  const applyHouseholdIncomeToLoan = () => {
    if (!incomeWorksheet) return;
    const drafts = householdToIncomeLineDrafts(incomeWorksheet);
    if (drafts.length === 0) {
      toast({
        title: "No qualifying income yet",
        description:
          "Enter base pay (and any variable income) for at least one borrower in the household worksheet above.",
        variant: "destructive",
      });
      return;
    }
    const existing = sumLines(inputs.income);
    if (existing > 0.5) {
      const ok = window.confirm(
        `Replace current monthly income (${fmtMoney(existing)}) with household qualifying income (${fmtMoney(
          drafts.reduce((s, d) => s + d.amount, 0),
        )}) from ${drafts.length} borrower${drafts.length === 1 ? "" : "s"}?`,
      );
      if (!ok) return;
    }
    const income: LineItem[] = drafts.map((d) => ({
      id: newLineId("inc"),
      label: d.label,
      amount: d.amount,
    }));
    patch({ income });
    toast({
      title: "Income applied to loan calc",
      description: `${drafts.length} borrower line${drafts.length === 1 ? "" : "s"} · ${fmtMoney(
        drafts.reduce((s, d) => s + d.amount, 0),
      )} / mo total`,
    });
  };

  const handleSaveLocal = () => {
    const title = `${kindTitle(kind)} · ${fmtMoney(inputs.salesPrice, 0)}`;
    const resultSave = saveCalculation({ kind, title, brokerId, inputs });
    if (resultSave.ok === false) {
      const saveError = resultSave.error;
      toast({
        title: "Could not save",
        description:
          saveError === "no_broker"
            ? "Sign in again, then retry save."
            : saveError === "quota"
              ? "Browser storage is full. Delete older saves and try again."
              : "Invalid worksheet data.",
        variant: "destructive",
      });
      return;
    }
    setSaves(listSavedCalculations(brokerId));
    toast({
      title: "Calculation saved",
      description: "Stored in this browser for your account.",
    });
  };

  const handleSave = async () => {
    if (!linkedClient) {
      handleSaveLocal();
      return;
    }
    const title = `${kindTitle(kind)} · ${fmtMoney(inputs.salesPrice, 0)} · ${linkedClient.first_name} ${linkedClient.last_name}`;
    const summary_json = {
      sales_price: inputs.salesPrice,
      total_monthly_payment: result.totalMonthlyPayment,
      total_loan: result.totalLoan,
      interest_rate: inputs.interestRate,
      ltv: result.ltv,
      front_end_ratio: result.ratiosAvailable ? result.frontEndRatio : null,
      back_end_ratio: result.ratiosAvailable ? result.backEndRatio : null,
    };
    try {
      if (linkedSaveId) {
        const upd = await dispatch(
          updateCalculatorSave({
            id: linkedSaveId,
            payload: {
              client_id: linkedClient.id,
              loan_application_id: linkedLoanId,
              kind,
              title,
              summary_json,
              payload_json: inputs as unknown as Record<string, unknown>,
            },
          }),
        );
        if (updateCalculatorSave.fulfilled.match(upd)) {
          toast({ title: "Saved to CRM", description: title });
        } else {
          toast({
            title: "Could not save",
            description: String(upd.payload),
            variant: "destructive",
          });
        }
      } else {
        const created = await dispatch(
          createCalculatorSave({
            client_id: linkedClient.id,
            loan_application_id: linkedLoanId,
            kind,
            title,
            summary_json,
            payload_json: inputs as unknown as Record<string, unknown>,
          }),
        );
        if (createCalculatorSave.fulfilled.match(created)) {
          onLinkedSaveIdChange?.(created.payload.id);
          toast({ title: "Saved to CRM", description: title });
        } else {
          toast({
            title: "Could not save",
            description: String(created.payload),
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      logger.error("[LoanWorksheet] API save failed", err);
      toast({
        title: "Could not save",
        description: "Unexpected error",
        variant: "destructive",
      });
    }
  };

  const handleApplyNote = async () => {
    if (!linkedSaveId || !linkedLoanId) {
      toast({
        title: "Link a loan and save first",
        description: "Save to CRM with a loan selected, then apply the note.",
        variant: "destructive",
      });
      return;
    }
    const resultApply = await dispatch(
      applyCalculatorSaveNote({
        id: linkedSaveId,
        payload: { loan_application_id: linkedLoanId },
      }),
    );
    if (applyCalculatorSaveNote.fulfilled.match(resultApply)) {
      toast({
        title: "Applied to loan notes",
        description: "Snapshot appended — loan income fields were not changed.",
      });
    } else {
      toast({
        title: "Apply failed",
        description: String(resultApply.payload),
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="loan-calc-print-root space-y-6">
      <PageHeader
        icon={<Calculator className="h-7 w-7 text-primary" />}
        title={kindTitle(kind)}
        description={kindBlurb(kind)}
        className="mb-0"
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSaves(listSavedCalculations(brokerId));
                setSavesOpen((o) => !o);
              }}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Local
            </Button>
            {linkedClient && linkedLoanId && linkedSaveId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleApplyNote()}
                disabled={isApplying}
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FilePlus2 className="h-4 w-4 mr-2" />
                )}
                Apply note
              </Button>
            )}
            <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {linkedClient ? "Save to CRM" : "Save"}
            </Button>
          </div>
        }
      />

      <section className="rounded-xl border bg-card p-5 space-y-4 print:hidden">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          CRM link
        </h3>
        <ClientLinkCombobox
          value={linkedClient}
          onChange={(c) => {
            onLinkedClientChange?.(c);
            onLinkedSaveIdChange?.(null);
            if (!c) onLinkedLoanIdChange?.(null);
          }}
          createDefaults={{
            first_name: "",
            last_name: "",
          }}
        />
        {linkedClient && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Match open loan (optional)
            </Label>
            <Select
              value={linkedLoanId != null ? String(linkedLoanId) : "none"}
              onValueChange={(v) => {
                if (v === "none") {
                  onLinkedLoanIdChange?.(null);
                  return;
                }
                const id = parseInt(v, 10);
                onLinkedLoanIdChange?.(id);
                const loan = openLoans.find((l) => l.id === id);
                if (loan?.property_value != null) {
                  onChange({
                    ...inputs,
                    salesPrice: Number(loan.property_value) || inputs.salesPrice,
                    interestRate:
                      loan.interest_rate != null
                        ? Number(loan.interest_rate)
                        : inputs.interestRate,
                  });
                }
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select loan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No loan</SelectItem>
                {openLoans.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.application_number}
                    {l.property_value != null
                      ? ` · ${fmtMoney(Number(l.property_value), 0)}`
                      : ""}
                    {` · ${l.status.replace(/_/g, " ")}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Selecting a loan prefills sales price from property value when available.
              Apply note appends a snapshot to loan notes only — income lines are never overwritten.
            </p>
          </div>
        )}
      </section>

      {savesOpen && (
        <div className="rounded-xl border bg-card p-4 space-y-2 print:hidden max-h-56 overflow-auto">
          {saves.filter((s) => s.kind === kind).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved scenarios for this calculator yet.
            </p>
          ) : (
            saves
              .filter((s) => s.kind === kind)
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border p-2.5"
                >
                  <button
                    type="button"
                    className="flex-1 text-left text-sm hover:text-primary"
                    onClick={() => {
                      const next = normalizeLoanCalcInputs(s.inputs);
                      if (!next) {
                        toast({
                          title: "Could not load",
                          description: "Saved data is incomplete.",
                          variant: "destructive",
                        });
                        return;
                      }
                      onChange(next);
                      setSavesOpen(false);
                      toast({
                        title: "Loaded",
                        description: s.title,
                      });
                    }}
                  >
                    <p className="font-semibold truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.savedAt).toLocaleString()}
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      deleteSavedCalculation(s.id, brokerId);
                      setSaves(listSavedCalculations(brokerId));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_min(100%,380px)] gap-6 pb-8">
      <div className="space-y-5 min-w-0">

        {incomeWorksheet && onIncomeWorksheetChange && (
          <section className="rounded-xl border bg-card overflow-hidden print:break-inside-avoid">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
              <button
                type="button"
                className="flex items-center gap-2 text-left min-w-0"
                onClick={() => setIncomeOpen((o) => !o)}
              >
                {incomeOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Household income worksheet
                  </p>
                  <p className="text-sm font-semibold tabular-nums truncate">
                    {fmtMoney(householdTotal)} / mo qualifying
                    {incomeDraftCount > 0
                      ? ` · ${incomeDraftCount} borrower${incomeDraftCount === 1 ? "" : "s"}`
                      : " · no borrowers with income yet"}
                  </p>
                </div>
              </button>
              <Button
                type="button"
                size="sm"
                className="print:hidden"
                onClick={applyHouseholdIncomeToLoan}
                disabled={incomeDraftCount === 0}
              >
                <ArrowDownToLine className="h-4 w-4 mr-1.5" />
                Apply to monthly income
              </Button>
            </div>
            {incomeOpen && (
              <div className="p-4 border-t">
                <WageEarnerWorksheet
                  worksheet={incomeWorksheet}
                  onChange={onIncomeWorksheetChange}
                  brokerId={brokerId}
                  linkedClient={linkedClient}
                  onLinkedClientChange={onLinkedClientChange}
                  linkedLoanId={linkedLoanId}
                  onLinkedLoanIdChange={onLinkedLoanIdChange}
                  linkedSaveId={linkedSaveId}
                  onLinkedSaveIdChange={onLinkedSaveIdChange}
                  embedded
                />
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border bg-card p-5 space-y-4 print:break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            1 · Loan details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MoneyInput
              label="Sales Price"
              value={inputs.salesPrice}
              onChange={(n) => patch({ salesPrice: n })}
            />
            <MoneyInput
              label="Down Payment %"
              value={inputs.downPaymentPct}
              onChange={(n) => patch({ downPaymentPct: n })}
              prefix=""
              suffix="%"
            />
            <MoneyInput
              label="Interest Rate"
              value={inputs.interestRate}
              onChange={(n) => patch({ interestRate: n })}
              prefix=""
              suffix="%"
            />
            {kind === "fha" && (
              <>
                <MoneyInput
                  label="Upfront MIP"
                  value={inputs.upfrontMipPct}
                  onChange={(n) => patch({ upfrontMipPct: n })}
                  prefix=""
                  suffix="%"
                />
                <MoneyInput
                  label="MI Factor"
                  value={inputs.miFactorPct}
                  onChange={(n) => patch({ miFactorPct: n })}
                  prefix=""
                  suffix="%"
                  hint="Annual MIP factor (auto default 0.55%)"
                />
              </>
            )}
            {kind === "va" && (
              <MoneyInput
                label="VA Funding Fee"
                value={inputs.vaFundingFeePct}
                onChange={(n) => patch({ vaFundingFeePct: n })}
                prefix=""
                suffix="%"
              />
            )}
            {(kind === "conventional" ||
              kind === "investment" ||
              kind === "mobile_home") && (
              <MoneyInput
                label="PMI Annual %"
                value={inputs.pmiAnnualPct}
                onChange={(n) => patch({ pmiAnnualPct: n })}
                prefix=""
                suffix="%"
                hint="Applied when LTV > 80%"
              />
            )}
            <MoneyInput
              label="Annual Tax Rate"
              value={inputs.annualTaxRatePct}
              onChange={(n) => patch({ annualTaxRatePct: n })}
              prefix=""
              suffix="%"
            />
            <MoneyInput
              label="Homeowners Insurance"
              value={inputs.homeownersInsuranceMonthly}
              onChange={(n) => patch({ homeownersInsuranceMonthly: n })}
              hint="Monthly estimate"
            />
            <MoneyInput
              label="HOA / mo"
              value={inputs.hoaMonthly}
              onChange={(n) => patch({ hoaMonthly: n })}
            />
            {kind === "investment" && (
              <MoneyInput
                label="Rental Income / mo"
                value={inputs.rentalIncomeMonthly}
                onChange={(n) => patch({ rentalIncomeMonthly: n })}
                hint="75% credited toward ratios"
              />
            )}
          </div>
        </section>

        <LineList
          title="2 · Monthly income"
          placeholder="e.g., Base Salary"
          items={inputs.income}
          onChange={(income) => patch({ income })}
          addLabel="Add income source"
          totalLabel="Total Monthly Income"
        />
        {incomeWorksheet && (
          <p className="-mt-3 text-[11px] text-muted-foreground px-1 print:hidden">
            Tip: build household income in the worksheet above, then{" "}
            <button
              type="button"
              className="underline font-medium text-foreground"
              onClick={applyHouseholdIncomeToLoan}
            >
              Apply to monthly income
            </button>{" "}
            so all borrowers feed DTI ratios.
          </p>
        )}

        <LineList
          title="3 · Monthly debts"
          placeholder="e.g., Car Payment"
          items={inputs.debts}
          onChange={(debts) => patch({ debts })}
          addLabel="Add debt / obligation"
          totalLabel="Total Monthly Debt"
        />

        <section className="rounded-xl border bg-card p-5 space-y-4 print:break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            4 · Bank & closing funds
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MoneyInput
              label="Bank Account Balance"
              value={inputs.bankBalance}
              onChange={(n) => patch({ bankBalance: n })}
            />
            <MoneyInput
              label="Est. Closing Cost %"
              value={inputs.closingCostPct}
              onChange={(n) => patch({ closingCostPct: n })}
              prefix=""
              suffix="%"
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Account # (optional)
              </Label>
              <Input
                value={inputs.accountLast4}
                maxLength={4}
                placeholder="Last 4"
                onChange={(e) =>
                  patch({
                    accountLast4: e.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
                className="h-10 max-w-[140px]"
              />
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-4 self-start print:static">
        <ResultsCards result={result} inputs={inputs} />

        <div className="rounded-xl border bg-card p-5 space-y-3 print:break-inside-avoid">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Payment mix
          </p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        pieData[0]?.name === "No payment yet"
                          ? "hsl(0 0% 90%)"
                          : PIE_COLORS[i % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(v: number) => fmtMoney(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {pieData
              .filter((p) => p.name !== "No payment yet")
              .map((p, i) => (
                <span key={p.name} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{
                      background: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                  {p.name}
                </span>
              ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-2 print:break-inside-avoid">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Qualifying ratios
          </p>
          {!result.ratiosAvailable ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              Add monthly income to calculate front-end and back-end ratios.
              Empty income is not treated as 0% DTI.
            </div>
          ) : (
            <>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ratioBars}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, ratioDomainMax]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={72}
                      tick={{ fontSize: 11 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {ratioBars.map((r, i) => (
                        <Cell key={i} fill={r.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[11px] text-muted-foreground">Front-end</p>
                  <p className="font-bold">{fmtPct(result.frontEndRatio)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[11px] text-muted-foreground">Back-end</p>
                  <p className="font-bold">{fmtPct(result.backEndRatio)}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <Button
          className="w-full h-11 font-semibold print:hidden"
          onClick={handleSave}
        >
          <Save className="h-4 w-4 mr-2" />
          Save this calculation
        </Button>

        <p className="text-[10px] text-muted-foreground leading-relaxed pb-2">
          Internal tool. Estimates only — confirm with your AE
          and current investor guidelines.
        </p>
      </aside>
      </div>
    </div>
  );
}

function ResultsCards({
  result,
  inputs,
}: {
  result: LoanCalcResult;
  inputs: LoanCalcInputs;
}) {
  return (
    <div className="space-y-3 print:break-inside-avoid">
      <div className="rounded-2xl bg-foreground text-background p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
          Total monthly payment
        </p>
        <p className="text-3xl font-extrabold mt-1 tabular-nums">
          {fmtMoney(result.totalMonthlyPayment)}
        </p>
        <div className="mt-4 space-y-1.5 text-sm opacity-90">
          <Row label="Principal & Interest" value={result.principalAndInterest} />
          <Row label="Property Taxes" value={result.monthlyTax} />
          <Row label="Insurance" value={result.monthlyInsurance} />
          <Row label={result.miLabel} value={result.monthlyMi} />
          <Row label="HOA" value={result.monthlyHoa} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-1.5 text-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Loan amount
        </p>
        <Row label="Down Payment" value={result.downPayment} muted />
        <Row label="Base Loan Amount" value={result.baseLoan} muted />
        <Row label={result.feeLabel} value={result.financedFee} muted />
        <Row label="Total Loan Amount" value={result.totalLoan} muted bold />
        <p className="text-[11px] text-muted-foreground pt-1">
          LTV {fmtPct(result.ltv)}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-1.5 text-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Closing funds
        </p>
        <Row
          label={`Est. Closing Costs (${fmtPct(inputs.closingCostPct)})`}
          value={result.estClosingCosts}
          muted
        />
        <Row label="Down Payment" value={result.downPayment} muted />
        <Row label="Total Funds Needed" value={result.totalFundsNeeded} muted bold />
        <div
          className={cn(
            "mt-2 rounded-lg px-3 py-2 font-semibold",
            result.surplus >= 0
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-primary/5 text-primary border border-primary/20",
          )}
        >
          {result.surplus >= 0 ? "Surplus" : "Shortfall"}{" "}
          {fmtMoney(Math.abs(result.surplus))}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: number;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3",
        muted && "text-foreground/80",
        bold && "font-bold",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums shrink-0">{fmtMoney(value)}</span>
    </div>
  );
}
