import { useState, useMemo } from "react";

export type SortDir = "asc" | "desc";

/**
 * Generic column-sort hook.
 *
 * Usage:
 *   const { sorted, sortKey, sortDir, requestSort } = useSortableData(myArray, "created_at", "desc");
 *
 * Pass `sorted` to your render list; call `requestSort("fieldName")` from a
 * column-header click handler.  Clicking the same column twice reverses direction.
 */
export function useSortableData<T extends Record<string, unknown>>(
  data: T[],
  defaultKey: keyof T | null = null,
  defaultDir: SortDir = "asc",
) {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, {
              numeric: true,
              sensitivity: "base",
            });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const requestSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return { sorted, sortKey, sortDir, requestSort };
}
