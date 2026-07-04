import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export type SortableColumn<T, K extends string> = {
  key: K;
  label: string;
  // ソート値。null/undefined/空文字は方向に関わらず末尾に置く。
  sortValue: (row: T) => string | number | null | undefined;
};

type UseTableSortOptions<T, K extends string> = {
  initialKey: K;
  initialDir?: SortDir; // 既定 desc
  tiebreak?: (a: T, b: T) => number; // 同値時の安定化（既定 0）
};

export function useTableSort<T, K extends string>(
  rows: readonly T[],
  columns: readonly SortableColumn<T, K>[],
  { initialKey, initialDir = "desc", tiebreak }: UseTableSortOptions<T, K>
) {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return [...rows];
    const factor = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue(a);
      const vb = col.sortValue(b);
      const aEmpty = va === null || va === undefined || va === "";
      const bEmpty = vb === null || vb === undefined || vb === "";
      if (aEmpty && bEmpty) return tiebreak ? tiebreak(a, b) : 0;
      if (aEmpty) return 1; // 空は常に末尾
      if (bEmpty) return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "ja");
      if (cmp !== 0) return cmp * factor;
      return tiebreak ? tiebreak(a, b) : 0;
    });
  }, [rows, columns, sortKey, sortDir, tiebreak]);

  const handleSort = (key: K) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc"); // 別項目は最初のクリックで降順（VenueTable 踏襲）
    }
  };

  const ariaSort = (key: K): "ascending" | "descending" | "none" =>
    key !== sortKey ? "none" : sortDir === "asc" ? "ascending" : "descending";

  return { sorted, sortKey, sortDir, handleSort, ariaSort };
}
