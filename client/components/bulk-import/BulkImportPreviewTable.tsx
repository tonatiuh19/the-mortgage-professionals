import React from "react";
import {
  CheckCircle2,
  MinusCircle,
  XCircle,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  filterPreviewRows,
  type BulkImportRowPreview,
  type BulkImportTableFilter,
} from "@shared/bulk-import";

const FILTERS: { id: BulkImportTableFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "skipped", label: "Skipped" },
  { id: "error", label: "Errors" },
];

function StatusIcon({ status }: { status: BulkImportRowPreview["status"] }) {
  if (status === "will_create")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "skipped")
    return <MinusCircle className="h-4 w-4 shrink-0 text-amber-600" />;
  return <XCircle className="h-4 w-4 shrink-0 text-red-600" />;
}

interface BulkImportPreviewTableProps {
  rows: BulkImportRowPreview[];
  entity: "clients" | "realtors";
  filter: BulkImportTableFilter;
  search: string;
  counts: { all: number; ready: number; skipped: number; error: number };
  onFilterChange: (f: BulkImportTableFilter) => void;
  onSearchChange: (q: string) => void;
}

export default function BulkImportPreviewTable({
  rows,
  entity,
  filter,
  search,
  counts,
  onFilterChange,
  onSearchChange,
}: BulkImportPreviewTableProps) {
  const filtered = filterPreviewRows(rows, filter, search);
  const badgeLabel = entity === "clients" ? "Lead source" : "Partner type";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone…"
            className="pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border">
        <ScrollArea className="max-h-[50vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium w-10">#</th>
                <th className="px-3 py-2 font-medium w-8" />
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">{badgeLabel}</th>
                <th className="px-3 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No rows match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.row_number}
                    className="border-t hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {row.row_number}
                    </td>
                    <td className="px-3 py-2">
                      <StatusIcon status={row.status} />
                    </td>
                    <td className="px-3 py-2 font-medium">{row.display_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.email || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.phone || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.badge ? (
                        <Badge variant="secondary" className="font-normal text-xs">
                          {row.badge}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                      {row.message || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2 max-h-[50vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No rows match your filter.
          </p>
        ) : (
          filtered.map((row) => (
            <div
              key={row.row_number}
              className="rounded-lg border bg-card p-3 space-y-1.5"
            >
              <div className="flex items-start gap-2">
                <StatusIcon status={row.status} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    #{row.row_number} · {row.display_name}
                  </p>
                  {row.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {row.email}
                    </p>
                  )}
                  {row.phone && (
                    <p className="text-xs text-muted-foreground">{row.phone}</p>
                  )}
                </div>
                {row.badge && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {row.badge}
                  </Badge>
                )}
              </div>
              {row.message && (
                <p className="text-xs text-muted-foreground pl-6">{row.message}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
