"use client";

import { useState } from "react";
import { PendingLink } from "@/components/ui/PendingLink";
import type { VenueVisitEntry } from "@/usecases/getVenueVisitStats";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type VenueVisitListProps = {
  entries: VenueVisitEntry[];
};

// 訪問会場の一覧。1行=1会場、展開ボタンで訪問公演の内訳をインライン表示する
// （Issue #250。#249 の SetlistRankingList の展開実装を踏襲）。
export function VenueVisitList({ entries }: VenueVisitListProps) {
  // 展開は複数同時展開を許容する（SetlistRankingList と同じ仕様）。
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        該当する会場がありません
      </p>
    );
  }

  const toggleExpanded = (venueId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(venueId)) {
        next.delete(venueId);
      } else {
        next.add(venueId);
      }
      return next;
    });
  };

  return (
    <ol className="space-y-2">
      {entries.map((entry, index) => {
        const isExpanded = expandedIds.has(entry.venueId);

        return (
          <li
            key={entry.venueId}
            className="rounded-lg border border-foreground/10 bg-background"
          >
            <div className="flex items-center gap-3 p-4">
              <span className="w-8 shrink-0 text-right text-sm font-semibold text-foreground/40">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <PendingLink
                  href={`/venues/${entry.venueId}`}
                  className="text-sm font-medium text-foreground hover:underline"
                  listBackFallbackHref={APP_ROUTES.venues}
                >
                  {entry.venueName}
                </PendingLink>
                {entry.venuePrefecture && (
                  <p className="mt-1 text-xs text-foreground/50">
                    {entry.venuePrefecture}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground">
                {entry.count}回
              </span>
              <button
                type="button"
                onClick={() => toggleExpanded(entry.venueId)}
                aria-expanded={isExpanded}
                className="shrink-0 rounded-lg border border-foreground/10 px-2 py-1 text-xs text-foreground/60 hover:bg-foreground/5"
              >
                {isExpanded ? "閉じる" : "内訳"}
              </button>
            </div>
            {isExpanded && (
              <ul className="space-y-1 border-t border-foreground/10 p-4 pt-3">
                {entry.visits.map((visit, visitIndex) => (
                  <li
                    // 1公演を複数回登録することは無いが、SetlistRankingList と同様に
                    // 念のため index も含めてキーの一意性を担保する
                    key={`${visit.liveId}-${visitIndex}`}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <span className="text-foreground/50">
                      {visit.performanceDate
                        ? formatDate(visit.performanceDate)
                        : "日付未定"}
                    </span>
                    <PendingLink
                      href={`/lives/${visit.liveId}`}
                      className="text-foreground hover:underline"
                      listBackFallbackHref={APP_ROUTES.mypageVenues}
                    >
                      {visit.liveName}
                    </PendingLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
