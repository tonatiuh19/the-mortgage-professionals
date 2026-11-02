import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  FilePlus2,
  FolderOpen,
  Loader2,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
  type BasePayMethod,
  type PayFrequency,
  type VariableStream,
  type WageEarnerBorrower,
  type WageEarnerWorksheet,
  computeHousehold,
  fmtMoney,
  ytdMonthsFromPayPeriod,
} from "@shared/income-qualify-engine";
import {
  deleteSavedIncomeWorksheet,
  listSavedIncomeWorksheets,
  normalizeWageEarnerWorksheet,
  saveIncomeWorksheet,
  type SavedIncomeWorksheet,
} from "./incomeQualifyStorage";

const METHOD_OPTIONS: { id: BasePayMethod; label: string; hint: string }[] = [
  {
    id: "annual_salary",
    label: "Annual Salary",
    hint: "Gross annual ÷ 12",
  },
  {
    id: "periodic_salary",
    label: "Base Salary (periodic)",
    hint: "Paystub amount × periods / 12",
  },
  {
    id: "hourly",
    label: "Base Hourly",
    hint: "Rate × hours/week × 52 / 12",
  },
  {
    id: "w2_average",
    label: "2-Year W-2 Average",
    hint: "Average of Box 1 totals ÷ 12",
  },
];

const FREQ_OPTIONS: { id: PayFrequency; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Bi-weekly" },
  { id: "semimonthly", label: "Semi-monthly" },
  { id: "monthly", label: "Monthly" },
];

function MoneyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-10 pl-7"
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function VariableBlock({
  title,
  stream,
  onChange,
  ytdMonths,
}: {
  title: string;
  stream: VariableStream;
  onChange: (s: VariableStream) => void;
  ytdMonths: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MoneyField
          label="YTD"
          value={stream.ytd}
          onChange={(ytd) => onChange({ ...stream, ytd })}
          hint={ytdMonths > 0 ? `÷ ${ytdMonths} mo × 12` : undefined}
        />
        <MoneyField
          label="Prior Year"
          value={stream.year1}
          onChange={(year1) => onChange({ ...stream, year1 })}
        />
        <MoneyField
          label="Year Before"
          value={stream.year2}
          onChange={(year2) => onChange({ ...stream, year2 })}
        />
      </div>
    </div>
  );
}

export function WageEarnerWorksheet({
  worksheet,
  onChange,
  brokerId,
  linkedClient = null,
  onLinkedClientChange,
  linkedLoanId = null,
  onLinkedLoanIdChange,
  linkedSaveId = null,
  onLinkedSaveIdChange,
  prefillLoanNumber = "",
  embedded = false,
}: {
  worksheet: WageEarnerWorksheet;
  onChange: (next: WageEarnerWorksheet) => void;
  brokerId: number | null;
  /** Primary CRM client for the household save (slot 1 also links per-borrower) */
  linkedClient?: LinkedClientValue | null;
  onLinkedClientChange?: (c: LinkedClientValue | null) => void;
  linkedLoanId?: number | null;
  onLinkedLoanIdChange?: (id: number | null) => void;
  linkedSaveId?: number | null;
  onLinkedSaveIdChange?: (id: number | null) => void;
  prefillLoanNumber?: string;
  /** Hide page chrome / household CRM link when nested inside a product calculator. */
  embedded?: boolean;
}) {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { openLoans, isSaving, isApplying } = useAppSelector(
    (s) => s.calculatorSaves,
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [savesOpen, setSavesOpen] = useState(false);
  const [saves, setSaves] = useState<SavedIncomeWorksheet[]>(() =>
    listSavedIncomeWorksheets(brokerId),
  );

  useEffect(() => {
    if (linkedClient?.id) {
      void dispatch(fetchClientOpenLoans(linkedClient.id));
    }
  }, [linkedClient?.id, dispatch]);

  // Prefill borrower 1 name/phone/email from primary linked client;
  // clearing the primary link also clears borrower[0] CRM link.
  useEffect(() => {
    const b0 = worksheet.borrowers[0];
    if (!linkedClient) {
      if (b0.linkedClientId != null) {
        const next = [...worksheet.borrowers] as WageEarnerWorksheet["borrowers"];
        next[0] = {
          ...next[0],
          linkedClientId: null,
          linkedPhone: "",
          linkedEmail: "",
        };
        onChange({ borrowers: next });
      }
      return;
    }
    if (b0.linkedClientId === linkedClient.id) return;
    const next = [...worksheet.borrowers] as WageEarnerWorksheet["borrowers"];
    next[0] = {
      ...next[0],
      linkedClientId: linkedClient.id,
      name:
        next[0].name.trim() ||
        `${linkedClient.first_name} ${linkedClient.last_name}`.trim(),
      linkedPhone: linkedClient.phone ?? "",
      linkedEmail: linkedClient.email ?? "",
      loanNumber: next[0].loanNumber.trim() || prefillLoanNumber || "",
    };
    onChange({ borrowers: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when link changes
  }, [linkedClient?.id, prefillLoanNumber]);

  const household = useMemo(() => computeHousehold(worksheet), [worksheet]);
  const borrower = worksheet.borrowers[activeIdx];
  const result = household.borrowers[activeIdx];
  const ytdMonths = ytdMonthsFromPayPeriod(
    borrower.payPeriodMonth,
    borrower.payPeriodDay,
  );

  const patchBorrower = (partial: Partial<WageEarnerBorrower>) => {
    const next = [...worksheet.borrowers] as WageEarnerWorksheet["borrowers"];
    next[activeIdx] = { ...next[activeIdx], ...partial };
    onChange({ borrowers: next });
  };

  const handleSaveLocal = () => {
    const name =
      worksheet.borrowers.find((b) => b.name.trim())?.name.trim() ||
      "Wage Earner";
    const loan =
      worksheet.borrowers.find((b) => b.loanNumber.trim())?.loanNumber.trim() ||
      "";
    const title = loan ? `${name} · ${loan}` : name;
    const saved = saveIncomeWorksheet({
      title,
      brokerId,
      worksheet,
    });
    if (saved.ok === false) {
      toast({
        title: "Could not save",
        description:
          saved.error === "no_broker"
            ? "Sign in again, then retry save."
            : saved.error === "quota"
              ? "Browser storage is full. Delete older saves and try again."
              : "Invalid worksheet data.",
        variant: "destructive",
      });
      return;
    }
    setSaves(listSavedIncomeWorksheets(brokerId));
    toast({
      title: "Worksheet saved",
      description: "Stored in this browser for your account.",
    });
  };

  const handleSave = async () => {
    if (!linkedClient) {
      handleSaveLocal();
      return;
    }
    const name =
      worksheet.borrowers.find((b) => b.name.trim())?.name.trim() ||
      `${linkedClient.first_name} ${linkedClient.last_name}`.trim() ||
      "Wage Earner";
    const loan =
      worksheet.borrowers.find((b) => b.loanNumber.trim())?.loanNumber.trim() ||
      "";
    const title = loan ? `${name} · ${loan}` : name;
    const borrower_client_ids = worksheet.borrowers.map(
      (b) => b.linkedClientId ?? null,
    );
    const summary_json = {
      household_total: household.householdTotal,
    };
    try {
      if (linkedSaveId) {
        const upd = await dispatch(
          updateCalculatorSave({
            id: linkedSaveId,
            payload: {
              client_id: linkedClient.id,
              loan_application_id: linkedLoanId,
              kind: "income",
              title,
              summary_json,
              payload_json: worksheet as unknown as Record<string, unknown>,
              borrower_client_ids,
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
            kind: "income",
            title,
            summary_json,
            payload_json: worksheet as unknown as Record<string, unknown>,
            borrower_client_ids,
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
      logger.error("[WageEarnerWorksheet] API save failed", err);
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

  return (
    <div
      className={cn(
        "loan-calc-print-root space-y-6",
        embedded && "space-y-4",
      )}
    >
      {!embedded && (
        <PageHeader
          icon={<Calculator className="h-7 w-7 text-primary" />}
          title="Wage Earner Income Analysis"
          description="Work out each borrower's qualifying income from salary, overtime, commission, bonus, and non-taxable sources — up to 4 borrowers per loan."
          className="mb-0"
          actions={
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSaves(listSavedIncomeWorksheets(brokerId));
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
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
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
      )}

      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Household income worksheet
            </p>
            <p className="text-xs text-muted-foreground">
              Enter each borrower here, then apply the household total into
              monthly income below for DTI.
            </p>
          </div>
          <p className="text-sm font-bold tabular-nums text-primary">
            Household {fmtMoney(household.householdTotal)} / mo
          </p>
        </div>
      )}

      {!embedded && (
      <section className="rounded-xl border bg-card p-5 space-y-4 print:hidden">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Household CRM link
        </h3>
        <ClientLinkCombobox
          label="Primary client (required for CRM save)"
          value={linkedClient}
          onChange={(c) => {
            onLinkedClientChange?.(c);
            onLinkedSaveIdChange?.(null);
            if (!c) onLinkedLoanIdChange?.(null);
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
                if (loan) {
                  const next = [
                    ...worksheet.borrowers,
                  ] as WageEarnerWorksheet["borrowers"];
                  next[0] = {
                    ...next[0],
                    loanNumber: loan.application_number,
                  };
                  onChange({ borrowers: next });
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
                    {l.application_number} · {l.status.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>
      )}

      {!embedded && savesOpen && (
        <div className="rounded-xl border bg-card p-4 space-y-2 print:hidden max-h-56 overflow-auto">
          {saves.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved wage-earner worksheets yet.
            </p>
          ) : (
            saves.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-lg border p-2.5"
              >
                <button
                  type="button"
                  className="flex-1 text-left text-sm hover:text-primary"
                  onClick={() => {
                    const next = normalizeWageEarnerWorksheet(s.worksheet);
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
                    toast({ title: "Loaded", description: s.title });
                  }}
                >
                  <p className="font-semibold truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.savedAt).toLocaleString()} ·{" "}
                    {fmtMoney(s.householdTotal)} / mo
                  </p>
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    deleteSavedIncomeWorksheet(s.id, brokerId);
                    setSaves(listSavedIncomeWorksheets(brokerId));
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Borrower summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {household.borrowers.map((r, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              activeIdx === i
                ? "bg-foreground text-background border-foreground"
                : "bg-card hover:bg-muted/40",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                activeIdx === i ? "opacity-70" : "text-muted-foreground",
              )}
            >
              Borrower {i + 1}
            </p>
            <p className="text-lg font-bold tabular-nums mt-0.5">
              {fmtMoney(r.incomeUsedToQualify)}
            </p>
          </button>
        ))}
        <div className="rounded-xl border border-primary/30 bg-primary text-primary-foreground p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            Household Total
          </p>
          <p className="text-lg font-bold tabular-nums mt-0.5">
            {fmtMoney(household.householdTotal)}
          </p>
        </div>
      </div>

      {/* Borrower tabs */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {[0, 1, 2, 3].map((i) => (
          <Button
            key={i}
            type="button"
            size="sm"
            variant={activeIdx === i ? "default" : "outline"}
            onClick={() => setActiveIdx(i)}
          >
            Borrower {i + 1}
            {worksheet.borrowers[i].name.trim()
              ? ` · ${worksheet.borrowers[i].name.trim()}`
              : ""}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_min(100%,360px)] gap-6 pb-8">
        <div className="space-y-5 min-w-0">
          {/* 1 · Borrower info */}
          <section className="rounded-xl border bg-card p-5 space-y-4 print:break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1 · Borrower info
            </h3>
            <ClientLinkCombobox
              label={`Borrower ${activeIdx + 1} client (optional)`}
              value={
                borrower.linkedClientId
                  ? {
                      id: borrower.linkedClientId,
                      first_name: borrower.name.split(" ")[0] || "",
                      last_name: borrower.name.split(" ").slice(1).join(" "),
                      email: borrower.linkedEmail || "",
                      phone: borrower.linkedPhone || null,
                    }
                  : null
              }
              onChange={(c) => {
                if (!c) {
                  patchBorrower({
                    linkedClientId: null,
                    linkedPhone: "",
                    linkedEmail: "",
                  });
                  return;
                }
                patchBorrower({
                  linkedClientId: c.id,
                  name:
                    borrower.name.trim() ||
                    `${c.first_name} ${c.last_name}`.trim(),
                  linkedPhone: c.phone ?? "",
                  linkedEmail: c.email ?? "",
                });
                if (activeIdx === 0) {
                  onLinkedClientChange?.(c);
                }
              }}
              allowCreate
              createDefaults={{
                first_name: borrower.name.split(" ")[0] || "",
                last_name: borrower.name.split(" ").slice(1).join(" "),
                email: borrower.linkedEmail,
                phone: borrower.linkedPhone,
              }}
            />
            {(borrower.linkedPhone || borrower.linkedEmail) && (
              <p className="text-xs text-muted-foreground">
                {[borrower.linkedEmail, borrower.linkedPhone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Borrower Name
                </Label>
                <Input
                  value={borrower.name}
                  onChange={(e) => patchBorrower({ name: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Loan #
                </Label>
                <Input
                  value={borrower.loanNumber}
                  onChange={(e) =>
                    patchBorrower({ loanNumber: e.target.value })
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Employer
                </Label>
                <Input
                  value={borrower.employer}
                  onChange={(e) => patchBorrower({ employer: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pay Period Ending — Month
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={borrower.payPeriodMonth}
                  onChange={(e) =>
                    patchBorrower({
                      payPeriodMonth: Math.min(
                        12,
                        Math.max(1, parseInt(e.target.value, 10) || 1),
                      ),
                    })
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pay Period Ending — Day
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={borrower.payPeriodDay}
                  onChange={(e) =>
                    patchBorrower({
                      payPeriodDay: Math.min(
                        31,
                        Math.max(1, parseInt(e.target.value, 10) || 1),
                      ),
                    })
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <MoneyField
                  label="YTD Amount"
                  value={borrower.baseYtdAmount}
                  onChange={(baseYtdAmount) =>
                    patchBorrower({ baseYtdAmount })
                  }
                  hint="Paystub year-to-date gross — for finish-the-year tracking"
                />
              </div>
              <div className="sm:col-span-2 rounded-lg bg-muted/40 px-3 py-2.5 space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      YTD Months (auto)
                    </p>
                    <p className="text-base font-bold tabular-nums">
                      {ytdMonths.toFixed(1)} months
                    </p>
                  </div>
                  {result.ytdPace ? (
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Year-end pace
                      </p>
                      <p className="text-base font-bold tabular-nums">
                        {fmtMoney(result.ytdPace.projectedAnnual, 0)} / yr
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Avg {fmtMoney(result.ytdPace.avgMonthly)} / mo so far
                        {result.ytdPace.tracking !== "n/a" && (
                          <>
                            {" "}
                            ·{" "}
                            <span
                              className={cn(
                                "font-semibold",
                                result.ytdPace.tracking === "ahead" &&
                                  "text-emerald-700",
                                result.ytdPace.tracking === "behind" &&
                                  "text-amber-700",
                                result.ytdPace.tracking === "on_pace" &&
                                  "text-foreground",
                              )}
                            >
                              {result.ytdPace.tracking === "ahead" &&
                                "ahead of stated pay"}
                              {result.ytdPace.tracking === "behind" &&
                                "behind stated pay"}
                              {result.ytdPace.tracking === "on_pace" &&
                                "tracking stated pay"}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground max-w-xs text-right">
                      Enter YTD Amount and a pay-period date after Jan 1 to see
                      projected year-end and pace vs stated base pay.
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  From the borrower&apos;s most recent paystub — YTD months also
                  drive OT / commission / bonus annualization below.
                </p>
              </div>
            </div>
          </section>

          {/* 2 · Base pay */}
          <section className="rounded-xl border bg-card p-5 space-y-4 print:break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2 · Base pay method
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {METHOD_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => patchBorrower({ baseMethod: m.id })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    borrower.baseMethod === m.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/40",
                  )}
                >
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {m.hint}
                  </p>
                </button>
              ))}
            </div>

            {borrower.baseMethod === "annual_salary" && (
              <MoneyField
                label="Annual Salary"
                value={borrower.annualSalary}
                onChange={(annualSalary) => patchBorrower({ annualSalary })}
              />
            )}
            {borrower.baseMethod === "periodic_salary" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MoneyField
                  label="Pay Amount"
                  value={borrower.periodicAmount}
                  onChange={(periodicAmount) =>
                    patchBorrower({ periodicAmount })
                  }
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Frequency
                  </Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={borrower.payFrequency}
                    onChange={(e) =>
                      patchBorrower({
                        payFrequency: e.target.value as PayFrequency,
                      })
                    }
                  >
                    {FREQ_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {borrower.baseMethod === "hourly" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MoneyField
                  label="Hourly Rate"
                  value={borrower.hourlyRate}
                  onChange={(hourlyRate) => patchBorrower({ hourlyRate })}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hours / Week
                  </Label>
                  <Input
                    type="number"
                    value={borrower.hoursPerWeek}
                    onChange={(e) =>
                      patchBorrower({
                        hoursPerWeek: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-10"
                  />
                </div>
              </div>
            )}
            {borrower.baseMethod === "w2_average" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MoneyField
                  label="W-2 Year 1 (most recent)"
                  value={borrower.w2Year1}
                  onChange={(w2Year1) => patchBorrower({ w2Year1 })}
                />
                <MoneyField
                  label="W-2 Year 2"
                  value={borrower.w2Year2}
                  onChange={(w2Year2) => patchBorrower({ w2Year2 })}
                />
              </div>
            )}

            <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Monthly Base Income
              </span>
              <span className="font-bold tabular-nums">
                {fmtMoney(result.monthlyBase)}
              </span>
            </div>
          </section>

          {/* 3 · Variable */}
          <section className="rounded-xl border bg-card p-5 space-y-4 print:break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              3 · Variable income (OT / Comm. / Bonus)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Qualifying uses the lesser of YTD-annualized vs 2-year average when
              history is present. Confirm continuity with your AE.
            </p>
            <VariableBlock
              title="Overtime"
              stream={borrower.overtime}
              ytdMonths={ytdMonths}
              onChange={(overtime) => patchBorrower({ overtime })}
            />
            <VariableBlock
              title="Commission"
              stream={borrower.commission}
              ytdMonths={ytdMonths}
              onChange={(commission) => patchBorrower({ commission })}
            />
            <VariableBlock
              title="Bonus"
              stream={borrower.bonus}
              ytdMonths={ytdMonths}
              onChange={(bonus) => patchBorrower({ bonus })}
            />
            <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Monthly Variable
              </span>
              <span className="font-bold tabular-nums">
                {fmtMoney(result.monthlyVariable)}
              </span>
            </div>
          </section>

          {/* 4 · Non-taxable + deductions */}
          <section className="rounded-xl border bg-card p-5 space-y-4 print:break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              4 · Non-taxable & deductions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MoneyField
                label="Non-Taxable Monthly"
                value={borrower.nonTaxableMonthly}
                onChange={(nonTaxableMonthly) =>
                  patchBorrower({ nonTaxableMonthly })
                }
                hint="Before gross-up"
              />
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Gross-Up %
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={borrower.nonTaxableGrossUpPct * 100}
                    onChange={(e) =>
                      patchBorrower({
                        nonTaxableGrossUpPct:
                          (parseFloat(e.target.value) || 0) / 100,
                      })
                    }
                    className="h-10 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Default 25% (agency guidelines vary)
                </p>
              </div>
              <MoneyField
                label="Monthly Deductions"
                value={borrower.deductionsMonthly}
                onChange={(deductionsMonthly) =>
                  patchBorrower({ deductionsMonthly })
                }
                hint="Subtracted from qualifying income"
              />
            </div>
          </section>
        </div>

        {/* Right panel */}
        <aside className="space-y-3 xl:sticky xl:top-4 self-start print:static">
          <div className="rounded-2xl bg-foreground text-background p-5 shadow-sm print:break-inside-avoid">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
              Income Used to Qualify — Borrower {activeIdx + 1}
            </p>
            <p className="text-3xl font-extrabold mt-1 tabular-nums">
              {fmtMoney(result.incomeUsedToQualify)}
            </p>
            <p className="text-xs opacity-70 mt-1">
              Base pay + variable + non-taxable − deductions
            </p>
            <div className="mt-4 space-y-1.5 text-sm opacity-90">
              <Row label="Base Pay" value={result.monthlyBase} />
              <Row
                label="Variable (OT/Comm./Bonus)"
                value={result.monthlyVariable}
                prefix="+"
              />
              <Row
                label="Non-Taxable Income"
                value={result.monthlyNonTaxable}
                prefix="+"
              />
              <Row
                label="Deductions"
                value={result.monthlyDeductions}
                prefix="−"
              />
              <div className="border-t border-background/20 pt-2 mt-2 flex justify-between font-bold">
                <span>Income Used to Qualify</span>
                <span className="tabular-nums">
                  {fmtMoney(result.incomeUsedToQualify)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2 print:break-inside-avoid">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              All borrowers
            </p>
            {household.borrowers.map((r, i) => (
              <div
                key={i}
                className="flex justify-between text-sm py-1 border-b border-border/60 last:border-0"
              >
                <span className="text-muted-foreground">
                  Borrower {i + 1}
                  {worksheet.borrowers[i].name.trim()
                    ? ` · ${worksheet.borrowers[i].name.trim()}`
                    : ""}
                </span>
                <span className="font-semibold tabular-nums">
                  {fmtMoney(r.incomeUsedToQualify)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-1">
              <span>Household Total</span>
              <span className="tabular-nums text-primary">
                {fmtMoney(household.householdTotal)}
              </span>
            </div>
          </div>

          {!embedded && (
            <Button
              className="w-full h-11 font-semibold print:hidden"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 mr-2" />
              Save this worksheet
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed pb-2">
            Internal tool. Estimates only — confirm with your AE
            and current investor guidelines.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  prefix,
}: {
  label: string;
  value: number;
  prefix?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="tabular-nums shrink-0">
        {prefix}
        {fmtMoney(value)}
      </span>
    </div>
  );
}

/** Exported for parent shell defaults */
export { blankWorksheet } from "@shared/income-qualify-engine";
