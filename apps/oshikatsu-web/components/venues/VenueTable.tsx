"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Venue } from "@/types/venue";
import { PREFECTURES } from "@/lib/prefectures";

type SortKey = "name" | "prefecture" | "capacity";
type SortDir = "asc" | "desc";

type VenueTableProps = {
  venues: Venue[];
};

// 北→南の順序（PREFECTURES の並び）。海外は48番目（47都道府県の次）。
// 未設定(null)は別途「常に末尾」で扱うため、ここでは非nullのみ受ける。
function prefectureRank(prefecture: string): number {
  const index = (PREFECTURES as readonly string[]).indexOf(prefecture);
  return index === -1 ? PREFECTURES.length : index;
}

export function VenueTable({ venues }: VenueTableProps) {
  // 既定は都道府県の北→南（昇順）
  const [sortKey, setSortKey] = useState<SortKey>("prefecture");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...venues].sort((a, b) => {
      if (sortKey === "capacity") {
        // 未設定（null）は方向に関わらず末尾
        if (a.capacity == null && b.capacity == null) {
          return a.name.localeCompare(b.name, "ja");
        }
        if (a.capacity == null) return 1;
        if (b.capacity == null) return -1;
        const cmp = a.capacity - b.capacity;
        return cmp !== 0 ? cmp * factor : a.name.localeCompare(b.name, "ja");
      }
      if (sortKey === "prefecture") {
        // 未設定（null）は方向に関わらず末尾
        if (!a.prefecture && !b.prefecture) {
          return a.name.localeCompare(b.name, "ja");
        }
        if (!a.prefecture) return 1;
        if (!b.prefecture) return -1;
        const cmp = prefectureRank(a.prefecture) - prefectureRank(b.prefecture);
        return cmp !== 0 ? cmp * factor : a.name.localeCompare(b.name, "ja");
      }
      return a.name.localeCompare(b.name, "ja") * factor;
    });
  }, [venues, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      // 別項目は最初のクリックで降順
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const indicator = (key: SortKey) => {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const headerButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="flex items-center font-medium text-foreground/70 hover:text-foreground"
    >
      {label}
      <span className="text-xs">{indicator(key)}</span>
    </button>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left">
            <th className="pb-2 pr-4">{headerButton("name", "会場名")}</th>
            <th className="pb-2 pr-4">{headerButton("prefecture", "都道府県")}</th>
            <th className="pb-2 pr-4">{headerButton("capacity", "キャパ")}</th>
            <th className="pb-2 font-medium text-foreground/70">操作</th>
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
              <td className="py-2">
                <Link
                  href={`/venues/${venue.id}/edit`}
                  className="text-sm text-blue-500 hover:underline"
                >
                  編集
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
