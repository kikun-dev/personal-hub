"use client";

// トップページ「過去の同月日」の year-group timeline（#345）。
// 年を時間軸の主アンカーとし、出来事ごとの同型カード反復にしない（Issue #341 Decision）。
// 履歴が育っても後続コンテンツが遠ざからないよう、初期表示は直近の年groupに限定し
// 年group単位で展開する（年の途中では切らない）。
import { useState } from "react";
import type { OnThisDayItem } from "@/types/event";
import { EventListItem, eventKey } from "@/components/events/EventListItem";

// 初期表示する年グループ数（超過分は「さらにN年を見る」で展開）
const VISIBLE_YEAR_GROUPS = 3;

type YearGroup = {
  year: number;
  events: OnThisDayItem[];
};

// 年別に Map 化してから年降順へ並べる（入力の並び順への暗黙依存を持たない）。
// 同一年内の順序は usecase 側の並び規則（日付降順 + compareDailyEvents）をそのまま保持する。
function groupByYear(events: OnThisDayItem[]): YearGroup[] {
  const byYear = new Map<number, OnThisDayItem[]>();
  for (const event of events) {
    const year = Number(event.date.slice(0, 4));
    const bucket = byYear.get(year);
    if (bucket) {
      bucket.push(event);
    } else {
      byYear.set(year, [event]);
    }
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, groupEvents]) => ({ year, events: groupEvents }));
}

type PastSameDayProps = {
  events: OnThisDayItem[];
  // 「過去の今日」（今日表示中）/「過去の8月9日」（別日表示中）。ページ側で組み立てる。
  title: string;
  // 「N年前」の基準年（選択日の年）
  currentYear: number;
};

export function PastSameDay({ events, title, currentYear }: PastSameDayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const groups = groupByYear(events);

  const hasMore = groups.length > VISIBLE_YEAR_GROUPS;
  const visibleGroups = isExpanded
    ? groups
    : groups.slice(0, VISIBLE_YEAR_GROUPS);
  const restYearCount = groups.length - VISIBLE_YEAR_GROUPS;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-foreground/60">過去の出来事はまだありません</p>
      ) : (
        <div className="rounded-lg border border-foreground/10 bg-background p-4">
          <div>
            {visibleGroups.map((group, index) => (
              <div
                key={group.year}
                className="grid grid-cols-[3.5rem_0.75rem_minmax(0,1fr)] gap-x-2 pb-4 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {currentYear - group.year}年前
                  </p>
                  <p className="text-xs text-foreground/60">{group.year}年</p>
                </div>
                {/* timeline rail: 年を示す dot と、次の年group へつなぐ縦線 */}
                <div aria-hidden="true" className="relative">
                  <span className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-foreground/30" />
                  {index < visibleGroups.length - 1 && (
                    <span className="absolute bottom-0 left-1/2 top-4 w-px -translate-x-1/2 bg-foreground/10" />
                  )}
                </div>
                <ul className="space-y-2.5">
                  {group.events.map((event) => (
                    <li key={eventKey(event)}>
                      <EventListItem event={event} variant="stacked" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="mt-3 border-t border-foreground/10 pt-3">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-expanded={isExpanded}
                className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5"
              >
                {isExpanded ? "折りたたむ" : `さらに${restYearCount}年を見る`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
