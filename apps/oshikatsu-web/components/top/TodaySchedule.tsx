"use client";

import { useState } from "react";
import { EventListItem, eventKey } from "@/components/events/EventListItem";
import type { CalendarEvent } from "@/types/event";

// 4件以上なら先頭3件 + 展開トグルにする（Issue #344 Design notes:
// 代表選定ロジックなし、並び先頭から3件）。
const VISIBLE_LIMIT = 3;

type TodayScheduleProps = {
  events: CalendarEvent[];
};

// トップページ「今日の予定」（#344）。ライブ/誕生日/リリース/動画/カスタムイベントを
// 同じ一覧で混在表示し、特定の1件を主役化しない。
export function TodaySchedule({ events }: TodayScheduleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (events.length === 0) {
    return <p className="text-sm text-foreground/60">今日の予定はありません</p>;
  }

  const hasMore = events.length > VISIBLE_LIMIT;
  const visibleEvents = isExpanded ? events : events.slice(0, VISIBLE_LIMIT);
  const restCount = events.length - VISIBLE_LIMIT;

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {visibleEvents.map((event) => (
          <li key={eventKey(event)}>
            <EventListItem event={event} />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5"
        >
          {isExpanded ? "折りたたむ" : `残り${restCount}件を表示`}
        </button>
      )}
    </div>
  );
}
