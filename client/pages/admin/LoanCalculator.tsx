import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Calculator } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import ClientCalculator from "@/pages/client/Calculator";
import { LoanWorksheet } from "./loan-calculator/LoanWorksheet";
import {
  WageEarnerWorksheet,
  blankWorksheet,
} from "./loan-calculator/WageEarnerWorksheet";
import { CalculatorSavesGrid } from "./loan-calculator/CalculatorSavesGrid";
import {
  DEFAULT_INPUTS,
  DEFAULTS_BY_KIND,
  kindBlurb,
  kindTitle,
  type LoanCalcInputs,
  type LoanCalcKind,
} from "@shared/loan-calc-engine";
import type { WageEarnerWorksheet as WageWorksheet } from "@shared/income-qualify-engine";
import {
  fetchCalculatorSave,
  fetchClientOpenLoans,
} from "@/store/slices/calculatorSavesSlice";
import { fetchClientProfile } from "@/store/slices/clientDetailSlice";
import type { LinkedClientValue } from "@/components/ClientLinkCombobox";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import { normalizeLoanCalcInputs } from "./loan-calculator/loanCalcStorage";
import { normalizeWageEarnerWorksheet } from "./loan-calculator/incomeQualifyStorage";

const KIND_FROM_SLUG: Record<string, LoanCalcKind | "income" | "saves"> = {
  fha: "fha",
  va: "va",
  conventional: "conventional",
  investment: "investment",
  "mobile-home": "mobile_home",
  "quick-payment": "quick_payment",
  income: "income",
  saves: "saves",
};

function blankInputsFor(
  kind: Exclude<LoanCalcKind, "quick_payment">,
): LoanCalcInputs {
  return {
    ...DEFAULT_INPUTS,
    ...DEFAULTS_BY_KIND[kind],
    income: DEFAULT_INPUTS.income.map((r) => ({ ...r })),
    debts: DEFAULT_INPUTS.debts.map((r) => ({ ...r })),
  };
}

/**
 * Broker CRM Loan Calculator suite — types via AdminLayout submenu.
 * Includes Wage Earner Income Worksheet and Saved Calculations grid.
 */
export default function LoanCalculator() {
  const { kind: kindSlug } = useParams<{ kind?: string }>();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const brokerId = useAppSelector((s) => s.brokerAuth.user?.id ?? null);

  const queryClientId = useMemo(() => {
    const raw = searchParams.get("clientId");
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
  const queryLoanId = useMemo(() => {
    const raw = searchParams.get("loanId");
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
  const querySaveId = useMemo(() => {
    const raw = searchParams.get("saveId");
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const active: LoanCalcKind | "income" | "saves" | null = useMemo(() => {
    if (!kindSlug) return null;
    return KIND_FROM_SLUG[kindSlug] ?? null;
  }, [kindSlug]);

  const [byKind, setByKind] = useState<
    Record<Exclude<LoanCalcKind, "quick_payment">, LoanCalcInputs>
  >(() => ({
    fha: blankInputsFor("fha"),
    va: blankInputsFor("va"),
    conventional: blankInputsFor("conventional"),
    investment: blankInputsFor("investment"),
    mobile_home: blankInputsFor("mobile_home"),
  }));

  const [incomeWorksheet, setIncomeWorksheet] = useState<WageWorksheet>(() =>
    blankWorksheet(),
  );

  const [linkedClient, setLinkedClient] = useState<LinkedClientValue | null>(
    null,
  );
  const [linkedLoanId, setLinkedLoanId] = useState<number | null>(null);
  const [linkedSaveId, setLinkedSaveId] = useState<number | null>(null);
  const [prefillLoanNumber, setPrefillLoanNumber] = useState<string>("");

  useEffect(() => {
    document.body.classList.add("loan-calc-suite-active");
    return () => document.body.classList.remove("loan-calc-suite-active");
  }, []);

  const prevBrokerIdRef = useRef<number | null>(brokerId);
  useEffect(() => {
    const prev = prevBrokerIdRef.current;
    prevBrokerIdRef.current = brokerId;
    if (prev != null && brokerId != null && prev !== brokerId) {
      setByKind({
        fha: blankInputsFor("fha"),
        va: blankInputsFor("va"),
        conventional: blankInputsFor("conventional"),
        investment: blankInputsFor("investment"),
        mobile_home: blankInputsFor("mobile_home"),
      });
      setIncomeWorksheet(blankWorksheet());
      setLinkedClient(null);
      setLinkedLoanId(null);
      setLinkedSaveId(null);
    }
  }, [brokerId]);

  // Prefill from ?clientId=&loanId=&saveId=
  useEffect(() => {
    let cancelled = false;
    async function loadFromQuery() {
      if (querySaveId) {
        try {
          const result = await dispatch(fetchCalculatorSave(querySaveId));
          if (cancelled) return;
          if (fetchCalculatorSave.fulfilled.match(result)) {
            const save = result.payload;
            setLinkedSaveId(save.id);
            setLinkedClient({
              id: save.client_id,
              first_name: save.client_first_name ?? "",
              last_name: save.client_last_name ?? "",
              email: save.client_email ?? "",
              phone: save.client_phone ?? null,
            });
            setLinkedLoanId(save.loan_application_id);
            if (save.application_number) {
              setPrefillLoanNumber(save.application_number);
            }
            if (save.kind === "income") {
              const next = normalizeWageEarnerWorksheet(save.payload_json);
              if (next) setIncomeWorksheet(next);
              else {
                toast({
                  title: "Could not load worksheet",
                  description: "Saved income payload is incomplete.",
                  variant: "destructive",
                });
              }
            } else if (
              save.kind === "fha" ||
              save.kind === "va" ||
              save.kind === "conventional" ||
              save.kind === "investment" ||
              save.kind === "mobile_home"
            ) {
              const next = normalizeLoanCalcInputs(save.payload_json);
              if (next) {
                setByKind((prev) => ({ ...prev, [save.kind]: next }));
              } else {
                toast({
                  title: "Could not load worksheet",
                  description: "Saved loan payload is incomplete.",
                  variant: "destructive",
                });
              }
            }
            return;
          }
          toast({
            title: "Could not load save",
            description: String(
              (result as { payload?: unknown }).payload ||
                "Save not found or access denied.",
            ),
            variant: "destructive",
          });
        } catch (err) {
          logger.error("[LoanCalculator] load save failed", err);
          toast({
            title: "Could not load save",
            description: "Unexpected error loading calculator save.",
            variant: "destructive",
          });
        }
      }

      if (queryClientId) {
        try {
          const profileResult = await dispatch(
            fetchClientProfile(queryClientId),
          );
          if (cancelled) return;
          if (fetchClientProfile.fulfilled.match(profileResult)) {
            const c = profileResult.payload.client;
            setLinkedClient({
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email,
              phone: c.phone,
            });
          }
          const loansResult = await dispatch(
            fetchClientOpenLoans(queryClientId),
          );
          if (cancelled) return;
          if (fetchClientOpenLoans.fulfilled.match(loansResult)) {
            const loans = loansResult.payload;
            const match =
              (queryLoanId
                ? loans.find((l) => l.id === queryLoanId)
                : undefined) ?? loans[0];
            if (match) {
              setLinkedLoanId(match.id);
              setPrefillLoanNumber(match.application_number);
              if (
                active &&
                active !== "income" &&
                active !== "saves" &&
                active !== "quick_payment" &&
                match.property_value != null
              ) {
                setByKind((prev) => ({
                  ...prev,
                  [active]: {
                    ...prev[active],
                    salesPrice: Number(match.property_value) || 0,
                    interestRate:
                      match.interest_rate != null
                        ? Number(match.interest_rate)
                        : prev[active].interestRate,
                  },
                }));
              }
            } else if (queryLoanId) {
              setLinkedLoanId(queryLoanId);
            }
          } else if (queryLoanId) {
            setLinkedLoanId(queryLoanId);
          }
        } catch (err) {
          logger.error("[LoanCalculator] client prefill failed", err);
        }
      } else if (queryLoanId) {
        setLinkedLoanId(queryLoanId);
      }
    }
    void loadFromQuery();
    return () => {
      cancelled = true;
    };
  }, [
    queryClientId,
    queryLoanId,
    querySaveId,
    dispatch,
    active,
  ]);

  if (!kindSlug || !active) {
    return <Navigate to="/admin/loan-calculator/fha" replace />;
  }

  if (active === "saves") {
    return <CalculatorSavesGrid />;
  }

  return (
    <div className="loan-calc-suite p-6 space-y-6 animate-in fade-in duration-300">
      {active === "income" ? (
        <WageEarnerWorksheet
          worksheet={incomeWorksheet}
          onChange={setIncomeWorksheet}
          brokerId={brokerId}
          linkedClient={linkedClient}
          onLinkedClientChange={setLinkedClient}
          linkedLoanId={linkedLoanId}
          onLinkedLoanIdChange={setLinkedLoanId}
          linkedSaveId={linkedSaveId}
          onLinkedSaveIdChange={setLinkedSaveId}
          prefillLoanNumber={prefillLoanNumber}
        />
      ) : active === "quick_payment" ? (
        <>
          <PageHeader
            icon={<Calculator className="h-7 w-7 text-primary" />}
            title={kindTitle("quick_payment")}
            description={kindBlurb("quick_payment")}
            className="mb-0"
          />
          <ClientCalculator hideApplyCta />
        </>
      ) : (
        <LoanWorksheet
          key={active}
          kind={active}
          inputs={byKind[active]}
          brokerId={brokerId}
          onChange={(next) =>
            setByKind((prev) => ({ ...prev, [active]: next }))
          }
          linkedClient={linkedClient}
          onLinkedClientChange={setLinkedClient}
          linkedLoanId={linkedLoanId}
          onLinkedLoanIdChange={setLinkedLoanId}
          linkedSaveId={linkedSaveId}
          onLinkedSaveIdChange={setLinkedSaveId}
          incomeWorksheet={incomeWorksheet}
          onIncomeWorksheetChange={setIncomeWorksheet}
        />
      )}
    </div>
  );
}
