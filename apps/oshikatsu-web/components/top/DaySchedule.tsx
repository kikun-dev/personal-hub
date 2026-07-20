"use client";

import { useState } from "react";
import { EventListItem, eventKey } from "@/components/events/EventListItem";
import type { CalendarEvent } from "@/types/event";

// 4件以上なら先頭3件 + 展開トグルにする（Issue #344 Design notes:
// 代表選定ロジックなし、並び先頭から3件）。
const VISIBLE_LIMIT = 3;

type DayScheduleProps = {
  events: CalendarEvent[];
  emptyMessage: string;
};

// トップページの日次予定一覧（#344、#345 で選択日にも対応）。
// 今日または選択日のライブ/誕生日/リリース/動画/カスタムイベントを同じ一覧で
// 混在表示し、特定の1件を主役化しない。
// #399: prototype準拠のgrouped surface（枠+divide-y）に統一する。
export function DaySchedule({ events, emptyMessage }: DayScheduleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (events.length === 0) {
    return (
      <div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-lg border border-border-subtle bg-background px-4 py-6 text-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          className="text-foreground-secondary"
        >
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
        <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
        <p className="text-xs text-foreground-secondary">
          過去の今日や、これからの予定を見てみましょう。
        </p>
      </div>
    );
  }

  const hasMore = events.length > VISIBLE_LIMIT;
  const visibleEvents = isExpanded ? events : events.slice(0, VISIBLE_LIMIT);

  return (
    <div className="rounded-lg border border-border-subtle bg-background">
      <ul className="divide-y divide-border-subtle px-3">
        {visibleEvents.map((event) => (
          <li key={eventKey(event)} className="py-2.5">
            <EventListItem event={event} variant="stacked" />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="w-full border-t border-border-subtle px-3 py-2.5 text-center text-xs text-foreground-secondary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {isExpanded ? "折りたたむ" : `全${events.length}件を見る`}
        </button>
      )}
    </div>
  );
}
