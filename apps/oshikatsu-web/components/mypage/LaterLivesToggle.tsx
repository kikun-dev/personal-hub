"use client";

import { useState } from "react";
import { UpcomingCard } from "@/components/mypage/UpcomingCard";
import type { MyAttendanceEntry } from "@/types/attendance";

type LaterLivesToggleProps = {
  entries: MyAttendanceEntry[];
};

// 「次のライブ」の2件目以降を折りたたんで表示する（#263）。
// 既定は閉じており、ボタンで開閉する（SetlistRankingList / VenueVisitList の
// 内訳トグルと同じトーン）。
export function LaterLivesToggle({ entries }: LaterLivesToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5"
      >
        次以降のライブ {entries.length}件
      </button>
      {isExpanded && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <UpcomingCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
