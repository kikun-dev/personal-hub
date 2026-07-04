"use client";

import type { Release } from "@/types/release";
import { RELEASE_TYPE_LABELS } from "@/types/release";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { TextLink } from "@/components/ui/TextLink";
import { SortableTh } from "@/components/ui/SortableTh";
import { formatDate } from "@/lib/formatters";
import { useTableSort, type SortableColumn } from "@/lib/useTableSort";

type SortKey = "title" | "group" | "type" | "numbering" | "releaseDate";

type AdminReleasesTableProps = {
  releases: Release[];
};

const RELEASE_COLUMNS: readonly SortableColumn<Release, SortKey>[] = [
  { key: "title", label: "タイトル", sortValue: (r) => r.title },
  { key: "group", label: "グループ", sortValue: (r) => r.groupNameJa },
  { key: "type", label: "タイプ", sortValue: (r) => RELEASE_TYPE_LABELS[r.releaseType] },
  { key: "numbering", label: "No.", sortValue: (r) => r.numbering },
  { key: "releaseDate", label: "リリース日", sortValue: (r) => r.releaseDate },
];

function releaseTiebreak(a: Release, b: Release): number {
  return a.title.localeCompare(b.title, "ja");
}

export function AdminReleasesTable({ releases }: AdminReleasesTableProps) {
  const { sorted, sortKey, sortDir, handleSort, ariaSort } = useTableSort(
    releases,
    RELEASE_COLUMNS,
    { initialKey: "releaseDate", initialDir: "desc", tiebreak: releaseTiebreak }
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              {RELEASE_COLUMNS.map((col) => (
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
            {sorted.map((release) => (
              <tr key={release.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4 text-foreground">{release.title}</td>
                <td className="py-2 pr-4">
                  <GroupBadge
                    groupName={release.groupNameJa}
                    groupColor={release.groupColor}
                  />
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {RELEASE_TYPE_LABELS[release.releaseType]}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {release.numbering ?? "—"}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {release.releaseDate ? formatDate(release.releaseDate) : "—"}
                </td>
                <td className="py-2">
                  <TextLink
                    href={`/admin/releases/${release.id}/edit`}
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

      {releases.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          リリースが登録されていません
        </p>
      )}
    </>
  );
}
