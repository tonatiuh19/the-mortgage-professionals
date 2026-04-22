import type { ReactNode } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PaginationInfo } from "@shared/api";

// ─── Column definition ───────────────────────────────────────────────────────

export interface DataGridColumn<T> {
  /** Field name — also used as the sort key when `sortable: true` */
  key: string;
  label: string;
  sortable?: boolean;
  /**
   * Extra classes applied to both <TableHead> and <TableCell>.
   * By default all cells are `whitespace-nowrap`; use `wrap` to override that.
   */
  className?: string;
  /** Override class for the header cell only */
  headerClassName?: string;
  /**
   * Pin this column to the left during horizontal scroll.
   * Typically used on the first (identity) column.
   */
  sticky?: boolean;
  /**
   * Shrink the column to its minimum content width.
   * Ideal for badge, date, and action columns that should not stretch.
   */
  shrink?: boolean;
  /**
   * Allow the cell content to wrap (overrides the default `whitespace-nowrap`).
   * Use for description / long-text columns.
   */
  wrap?: boolean;
  /**
   * Custom cell renderer. When omitted the raw field value is rendered as a
   * string (or "—" when nullish).
   */
  render?: (item: T, index: number) => ReactNode;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataGridProps<T> {
  data: T[];
  columns: DataGridColumn<T>[];
  /** Return a stable unique key for each row */
  rowKey: (item: T) => string | number;

  // Sorting — managed by the parent so the parent can dispatch API calls
  sortBy: string;
  sortDir: "ASC" | "DESC";
  onSort: (key: string) => void;

  // Pagination
  pagination?: PaginationInfo | null;
  onPageChange: (page: number) => void;

  isLoading?: boolean;
  /** Shown when `data` is empty and not loading */
  emptyMessage?: string;

  /**
   * Renders a single item as a card for the mobile (< sm) layout.
   * If omitted the table is always shown regardless of viewport.
   */
  mobileCard?: (item: T) => ReactNode;

  /**
   * @deprecated No longer needed — the table scrolls dynamically.
   * Kept for backwards compatibility, but ignored.
   */
  tableMinWidth?: string;
  /** Number of columns — used for colspan on empty/loading rows */
  colSpan?: number;
  /** Optional row click handler */
  onRowClick?: (item: T) => void;
  /**
   * When true, disables the negative-margin bleed used to escape card padding.
   * Use this when rendering DataGrid outside of a CardContent.
   */
  noBleeding?: boolean;
}

// ─── Sort icon helper ─────────────────────────────────────────────────────────

function SortIcon({
  column,
  sortBy,
  sortDir,
}: {
  column: string;
  sortBy: string;
  sortDir: "ASC" | "DESC";
}) {
  if (sortBy !== column)
    return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return sortDir === "ASC" ? (
    <ChevronUp className="h-3 w-3" />
  ) : (
    <ChevronDown className="h-3 w-3" />
  );
}

// ─── Shared sticky + shrink helpers ──────────────────────────────────────────

function stickyClasses(isSticky: boolean, bg = "bg-card") {
  return isSticky
    ? `sticky left-0 z-10 ${bg} shadow-[1px_0_0_0_hsl(var(--border))]`
    : "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataGrid<T>({
  data,
  columns,
  rowKey,
  sortBy,
  sortDir,
  onSort,
  pagination,
  onPageChange,
  isLoading = false,
  emptyMessage = "No data found.",
  mobileCard,
  colSpan,
  onRowClick,
  noBleeding = false,
}: DataGridProps<T>) {
  // ── Pagination footer ──────────────────────────────────────────────────────
  const paginationFooter = pagination && pagination.totalPages > 1 && (
    <div className="flex items-center justify-between mt-4 px-2 text-sm text-muted-foreground">
      <span>
        Showing {(pagination.page - 1) * pagination.limit + 1}–
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
        {pagination.total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!isLoading && data.length === 0) {
    return (
      <p className="text-center py-10 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      {/* Mobile card list — shown only on xs (< 640px) when mobileCard provided */}
      {mobileCard && (
        <div className="block sm:hidden space-y-3">
          {data.map((item) => (
            <div key={rowKey(item)}>{mobileCard(item)}</div>
          ))}
        </div>
      )}

      {/* Scrollable table — always rendered on sm+, always on all sizes when no mobileCard */}
      <div
        className={cn(
          mobileCard ? "hidden sm:block" : "block",
          // Negative margin lets the scroll area bleed to card edges;
          // padding restores the inner spacing so content isn't clipped.
          // When noBleeding=true (no card padding context) skip the bleed.
          noBleeding ? "overflow-x-auto" : "-mx-6 px-0 overflow-x-auto",
        )}
      >
        {/*
          `w-max min-w-full`: table is at least as wide as the container,
          but expands naturally to fit content — the outer div scrolls.
        */}
        <Table className="w-max min-w-full">
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    // Headers always stay on one line
                    "whitespace-nowrap",
                    // Shrink column to content width
                    col.shrink && "w-px",
                    // Sticky first column
                    col.sticky && stickyClasses(true, "bg-card"),
                    col.sticky && "z-20",
                    col.className,
                    col.headerClassName,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {col.label}{" "}
                      <SortIcon
                        column={col.key}
                        sortBy={sortBy}
                        sortDir={sortDir}
                      />
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={rowKey(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      // Default: cells never wrap — prevents badge/date text from breaking
                      !col.wrap && "whitespace-nowrap",
                      // Wrap mode: allow text to flow, capped at a readable width
                      col.wrap && "max-w-[260px] break-words",
                      // Shrink column to content
                      col.shrink && "w-px",
                      // Sticky
                      col.sticky && stickyClasses(true),
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(item, index)
                      : String(
                          (item as Record<string, unknown>)[col.key] ?? "—",
                        )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination -------------------------------------------------------- */}
      {paginationFooter}
    </>
  );
}
