"use client";

import type { SortDir } from "@/lib/useTableSort";

type SortableThProps = {
  label: string;
  active: boolean;
  dir: SortDir;
  ariaSort: "ascending" | "descending" | "none";
  onSort: () => void;
  className?: string;
};

export function SortableTh({
  label,
  active,
  dir,
  ariaSort,
  onSort,
  className = "pb-2 pr-4",
}: SortableThProps) {
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : "desc";
  return (
    <th scope="col" aria-sort={ariaSort} className={className}>
      <button
        type="button"
        onClick={onSort}
        aria-label={`${label}を${nextDir === "asc" ? "昇順" : "降順"}で並び替え`}
        className={`group flex items-center gap-0.5 hover:text-foreground ${
          active ? "font-semibold text-foreground" : "font-medium text-foreground/70"
        }`}
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-3 w-3 transition-all ${
            active
              ? dir === "asc"
                ? "rotate-180 opacity-100"
                : "opacity-100"
              : "opacity-0 group-hover:opacity-40"
          }`}
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>
    </th>
  );
}
