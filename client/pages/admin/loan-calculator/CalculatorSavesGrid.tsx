import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  FolderOpen,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteCalculatorSave,
  fetchCalculatorSaves,
} from "@/store/slices/calculatorSavesSlice";
import type { BrokerCalculatorSave, CalculatorSaveKind } from "@shared/api";
import { calculatorKindLabel } from "@shared/calculator-save-note";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { fmtMoney } from "@shared/loan-calc-engine";

const KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All kinds" },
  { value: "fha", label: "FHA" },
  { value: "va", label: "VA" },
  { value: "conventional", label: "Conventional" },
  { value: "investment", label: "Investment" },
  { value: "mobile_home", label: "Mobile Home" },
  { value: "income", label: "Income Worksheet" },
];

function kindToRoute(kind: CalculatorSaveKind): string {
  if (kind === "mobile_home") return "/admin/loan-calculator/mobile-home";
  if (kind === "income") return "/admin/loan-calculator/income";
  return `/admin/loan-calculator/${kind}`;
}

function summaryPreview(save: BrokerCalculatorSave): string {
  const s = save.summary_json ?? {};
  if (save.kind === "income") {
    const total = s.household_total ?? s.householdTotal;
    return total != null ? `${fmtMoney(Number(total))} / mo` : "—";
  }
  const pay = s.total_monthly_payment ?? s.totalMonthlyPayment ?? s.payment;
  const price = s.sales_price ?? s.salesPrice;
  const parts: string[] = [];
  if (price != null) parts.push(fmtMoney(Number(price), 0));
  if (pay != null) parts.push(`${fmtMoney(Number(pay))} / mo`);
  return parts.join(" · ") || "—";
}

export function CalculatorSavesGrid() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saves, pagination, isLoading } = useAppSelector(
    (s) => s.calculatorSaves,
  );

  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [clientIdFilter, setClientIdFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const doFetch = useCallback(
    (overrides?: {
      page?: number;
      q?: string;
      kind?: string;
      client_id?: string;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
    }) => {
      const cid = (overrides?.client_id ?? clientIdFilter).trim();
      void dispatch(
        fetchCalculatorSaves({
          page: overrides?.page ?? pagination?.page ?? 1,
          limit: pagination?.limit ?? 25,
          q: (overrides?.q ?? q).trim() || undefined,
          kind:
            (overrides?.kind ?? kind) === "all"
              ? undefined
              : ((overrides?.kind ?? kind) as CalculatorSaveKind),
          client_id: cid ? parseInt(cid, 10) : undefined,
          sortBy: overrides?.sortBy ?? sortBy,
          sortOrder: overrides?.sortOrder ?? sortDir,
        }),
      );
    },
    [
      dispatch,
      pagination?.page,
      pagination?.limit,
      q,
      kind,
      clientIdFilter,
      sortBy,
      sortDir,
    ],
  );

  useEffect(() => {
    doFetch({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const onSort = (key: string) => {
    const nextDir = sortBy === key && sortDir === "DESC" ? "ASC" : "DESC";
    setSortBy(key);
    setSortDir(nextDir);
    doFetch({ page: 1, sortBy: key, sortOrder: nextDir });
  };

  const columns = useMemo((): DataGridColumn<BrokerCalculatorSave>[] => {
    return [
      {
        key: "title",
        label: "Title",
        sortable: true,
        sticky: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="font-semibold truncate max-w-[220px]">{row.title}</p>
            <p className="text-xs text-muted-foreground">
              {calculatorKindLabel(row.kind)}
            </p>
          </div>
        ),
      },
      {
        key: "client",
        label: "Client",
        render: (row) => (
          <span className="text-sm">
            {[row.client_first_name, row.client_last_name]
              .filter(Boolean)
              .join(" ") || `Client #${row.client_id}`}
          </span>
        ),
      },
      {
        key: "summary",
        label: "Summary",
        render: (row) => (
          <span className="text-sm tabular-nums">{summaryPreview(row)}</span>
        ),
      },
      {
        key: "loan",
        label: "Loan",
        render: (row) =>
          row.application_number ? (
            <span className="font-mono text-xs">{row.application_number}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        key: "updated_at",
        label: "Updated",
        sortable: true,
        shrink: true,
        render: (row) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(row.updated_at).toLocaleString()}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        shrink: true,
        render: (row) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                navigate(
                  `${kindToRoute(row.kind)}?saveId=${row.id}&clientId=${row.client_id}${
                    row.loan_application_id
                      ? `&loanId=${row.loan_application_id}`
                      : ""
                  }`,
                );
              }}
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              Open
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              disabled={deletingId === row.id}
              onClick={async () => {
                setDeletingId(row.id);
                try {
                  const result = await dispatch(deleteCalculatorSave(row.id));
                  if (deleteCalculatorSave.fulfilled.match(result)) {
                    toast({ title: "Deleted", description: row.title });
                    doFetch();
                  } else {
                    toast({
                      title: "Delete failed",
                      description: String(result.payload),
                      variant: "destructive",
                    });
                  }
                } catch (err) {
                  logger.error("[CalculatorSavesGrid] delete failed", err);
                } finally {
                  setDeletingId(null);
                }
              }}
            >
              {deletingId === row.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ),
      },
    ];
  }, [deletingId, dispatch, doFetch, navigate, toast]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <PageHeader
        icon={<Calculator className="h-7 w-7 text-primary" />}
        title="Saved Calculations"
        description="Server-backed calculator scenarios linked to CRM clients. Filter by kind, client, or search."
        className="mb-0"
      />

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doFetch({ page: 1, q });
            }}
            placeholder="Search title, client, loan #…"
            className="h-10 pl-9"
          />
        </div>
        <Select
          value={kind}
          onValueChange={(v) => {
            setKind(v);
            doFetch({ page: 1, kind: v });
          }}
        >
          <SelectTrigger className="h-10 w-full sm:w-[180px]">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={clientIdFilter}
          onChange={(e) => setClientIdFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doFetch({ page: 1 });
          }}
          placeholder="Client ID"
          className="h-10 w-full sm:w-[120px]"
          inputMode="numeric"
        />
        <Button
          type="button"
          onClick={() => doFetch({ page: 1 })}
          className="h-10"
        >
          <Search className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <DataGrid
        data={saves}
        columns={columns}
        rowKey={(r) => r.id}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        pagination={pagination}
        onPageChange={(page) => doFetch({ page })}
        isLoading={isLoading}
        emptyMessage="No saved calculations yet. Link a client on a worksheet and Save."
        noBleeding
        mobileCard={(row) => (
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <p className="font-semibold">{row.title}</p>
            <p className="text-xs text-muted-foreground">
              {calculatorKindLabel(row.kind)} · {summaryPreview(row)}
            </p>
            <p className="text-sm">
              {[row.client_first_name, row.client_last_name]
                .filter(Boolean)
                .join(" ")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() =>
                navigate(
                  `${kindToRoute(row.kind)}?saveId=${row.id}&clientId=${row.client_id}${
                    row.loan_application_id
                      ? `&loanId=${row.loan_application_id}`
                      : ""
                  }`,
                )
              }
            >
              Open
            </Button>
          </div>
        )}
      />
    </div>
  );
}

export default CalculatorSavesGrid;
