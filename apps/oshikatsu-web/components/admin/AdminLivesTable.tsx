"use client";

import type { LiveListItem } from "@/types/live";
import { LIVE_TYPE_LABELS } from "@/types/live";
import { TextLink } from "@/components/ui/TextLink";
import { SortableTh } from "@/components/ui/SortableTh";
import { formatDate } from "@/lib/formatters";
import { useTableSort, type SortableColumn } from "@/lib/useTableSort";

type SortKey = "name" | "liveType" | "performanceCount" | "firstDate";

type AdminLivesTableProps = {
  lives: LiveListItem[];
};

const LIVE_COLUMNS: readonly SortableColumn<LiveListItem, SortKey>[] = [
  { key: "name", label: "ライブ名", sortValue: (l) => l.name },
  { key: "liveType", label: "種別", sortValue: (l) => LIVE_TYPE_LABELS[l.liveType] },
  { key: "performanceCount", label: "公演数", sortValue: (l) => l.performanceCount },
  { key: "firstDate", label: "初回日", sortValue: (l) => l.firstDate },
];

function liveTiebreak(a: LiveListItem, b: LiveListItem): number {
  return a.name.localeCompare(b.name, "ja");
}

export function AdminLivesTable({ lives }: AdminLivesTableProps) {
  const { sorted, sortKey, sortDir, handleSort, ariaSort } = useTableSort(
    lives,
    LIVE_COLUMNS,
    { initialKey: "firstDate", initialDir: "desc", tiebreak: liveTiebreak }
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              {LIVE_COLUMNS.map((col) => (
                <SortableTh
                  key={col.key}
                  label={col.label}
                  active={col.key === sortKey}
                  dir={sortDir}
                  ariaSort={ariaSort(col.key)}
                  onSort={() => handleSort(col.key)}
                />
              ))}
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((live) => (
              <tr key={live.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4 text-foreground">{live.name}</td>
                <td className="py-2 pr-4 text-foreground/70">
                  {LIVE_TYPE_LABELS[live.liveType]}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {live.performanceCount}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {live.firstDate ? formatDate(live.firstDate) : "—"}
                </td>
                <td className="py-2">
                  <TextLink
                    href={`/admin/lives/${live.id}/edit`}
                    feedback="global"
                    className="text-sm"
                  >
                    編集
                  </TextLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lives.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          ライブが登録されていません
        </p>
      )}
    </>
  );
}
