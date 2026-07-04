"use client";

import Link from "next/link";
import type { Venue } from "@/types/venue";
import { TextLink } from "@/components/ui/TextLink";
import { SortableTh } from "@/components/ui/SortableTh";
import { PREFECTURES } from "@/lib/prefectures";
import { useTableSort, type SortableColumn } from "@/lib/useTableSort";

type SortKey = "name" | "prefecture" | "capacity";

type VenueTableProps = {
  venues: Venue[];
  isAdmin: boolean;
};

// 北→南の順序（PREFECTURES の並び）。海外は48番目（47都道府県の次）。
// 未設定(null)は別途「常に末尾」で扱うため、ここでは非nullのみ受ける。
function prefectureRank(prefecture: string): number {
  const index = (PREFECTURES as readonly string[]).indexOf(prefecture);
  return index === -1 ? PREFECTURES.length : index;
}

const VENUE_COLUMNS: readonly SortableColumn<Venue, SortKey>[] = [
  { key: "name", label: "会場名", sortValue: (v) => v.name },
  {
    key: "prefecture",
    label: "都道府県",
    sortValue: (v) => (v.prefecture ? prefectureRank(v.prefecture) : null),
  },
  { key: "capacity", label: "キャパ", sortValue: (v) => v.capacity },
];

function venueTiebreak(a: Venue, b: Venue): number {
  return a.name.localeCompare(b.name, "ja");
}

export function VenueTable({ venues, isAdmin }: VenueTableProps) {
  // 既定は都道府県の北→南（昇順）
  const { sorted, sortKey, sortDir, handleSort, ariaSort } = useTableSort(
    venues,
    VENUE_COLUMNS,
    { initialKey: "prefecture", initialDir: "asc", tiebreak: venueTiebreak }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left">
            {VENUE_COLUMNS.map((col) => (
              <SortableTh
                key={col.key}
                label={col.label}
                active={col.key === sortKey}
                dir={sortDir}
                ariaSort={ariaSort(col.key)}
                onSort={() => handleSort(col.key)}
              />
            ))}
            {isAdmin && (
              <th scope="col" className="pb-2 font-medium text-foreground/70">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((venue) => (
            <tr key={venue.id} className="border-b border-foreground/5">
              <td className="py-2 pr-4">
                <Link
                  href={`/venues/${venue.id}`}
                  className="text-foreground hover:underline"
                >
                  {venue.name}
                </Link>
              </td>
              <td className="py-2 pr-4 text-foreground/70">
                {venue.prefecture ?? "—"}
              </td>
              <td className="py-2 pr-4 text-foreground/70">
                {venue.capacity != null
                  ? `${venue.capacity.toLocaleString()}人`
                  : "—"}
              </td>
              {isAdmin && (
                <td className="py-2">
                  <TextLink
                    href={`/venues/${venue.id}/edit`}
                    className="text-sm"
                  >
                    編集
                  </TextLink>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
