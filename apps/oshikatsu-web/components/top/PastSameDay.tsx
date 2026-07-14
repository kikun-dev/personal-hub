// トップページ「過去の同月日」の year-group timeline（#345）。
// 年を時間軸の主アンカーとし、出来事ごとの同型カード反復にしない（Issue #341 Decision）。
import type { OnThisDayItem } from "@/types/event";
import { EventListItem, eventKey } from "@/components/events/EventListItem";

type YearGroup = {
  year: number;
  events: OnThisDayItem[];
};

// events は usecase 側で日付降順ソート済みのため、連続する同一年をまとめるだけでよい
// （NextEvents の groupByDate と同じ fold 方式。#345 year-group timeline）。
function groupByYear(events: OnThisDayItem[]): YearGroup[] {
  const groups: YearGroup[] = [];
  for (const event of events) {
    const year = Number(event.date.slice(0, 4));
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.year === year) {
      lastGroup.events.push(event);
    } else {
      groups.push({ year, events: [event] });
    }
  }
  return groups;
}

type PastSameDayProps = {
  events: OnThisDayItem[];
  // 「過去の今日」（今日表示中）/「過去の8月9日」（別日表示中）。ページ側で組み立てる。
  title: string;
  // 「N年前」の基準年（選択日の年）
  currentYear: number;
};

export function PastSameDay({ events, title, currentYear }: PastSameDayProps) {
  const groups = groupByYear(events);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-foreground/60">過去の出来事はまだありません</p>
      ) : (
        <div className="divide-y divide-foreground/10">
          {groups.map((group) => (
            <div key={group.year} className="py-3 first:pt-0 last:pb-0">
              <p className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">
                  {group.year}年
                </span>
                <span className="text-xs text-foreground/60">
                  {currentYear - group.year}年前
                </span>
              </p>
              <ul className="mt-1.5 space-y-2.5">
                {group.events.map((event) => (
                  <li key={eventKey(event)}>
                    <EventListItem event={event} variant="stacked" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
