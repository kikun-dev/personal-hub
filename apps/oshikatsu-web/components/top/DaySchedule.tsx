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
export function DaySchedule({ events, emptyMessage }: DayScheduleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (events.length === 0) {
    return <p className="text-sm text-foreground-secondary">{emptyMessage}</p>;
  }

  const hasMore = events.length > VISIBLE_LIMIT;
  const visibleEvents = isExpanded ? events : events.slice(0, VISIBLE_LIMIT);
  const restCount = events.length - VISIBLE_LIMIT;

  return (
    <div className="space-y-2">
      <ul className="space-y-2.5">
        {visibleEvents.map((event) => (
          <li key={eventKey(event)}>
            <EventListItem event={event} variant="stacked" />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-foreground-secondary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {isExpanded ? "折りたたむ" : `残り${restCount}件を表示`}
        </button>
      )}
    </div>
  );
}
