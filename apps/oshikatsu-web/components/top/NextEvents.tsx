import type { CalendarEvent } from "@/types/event";
import { EventListItem, eventKey } from "@/components/events/EventListItem";
import { formatMonthDayWithWeekday } from "@/lib/formatters";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 「あとN日」= イベント日 - 今日（日数）。明日は「あと1日」。
function daysUntil(dateStr: string, todayStr: string): number {
  const eventDate = new Date(`${dateStr}T00:00:00`);
  const today = new Date(`${todayStr}T00:00:00`);
  return Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
}

type EventDateGroup = {
  date: string;
  events: CalendarEvent[];
};

// events は usecase 側で日付昇順（同日内は並び規則）にソート済みのため、
// 連続する同一日付をまとめるだけでよい（#344 レビュー対応: 日付グルーピング）。
function groupByDate(events: CalendarEvent[]): EventDateGroup[] {
  const groups: EventDateGroup[] = [];
  for (const event of events) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === event.date) {
      lastGroup.events.push(event);
    } else {
      groups.push({ date: event.date, events: [event] });
    }
  }
  return groups;
}

type NextEventsProps = {
  events: CalendarEvent[];
  today: Date;
  // "card"（デフォルト）= 現行の枠付きカード表示。
  // "plain" = 枠・padding無しの通常セクション表示（Mobile 用、#344 レビュー対応）。
  frame?: "card" | "plain";
};

// Desktop 右側 rail（Next Events）と Mobile 本文内の両方で使う共通コンポーネント（#344）。
// 配置・表示切替はページ側（hidden lg:block / lg:hidden）で行う。
export function NextEvents({ events, today, frame = "card" }: NextEventsProps) {
  const todayStr = toDateStr(today);
  const groups = groupByDate(events);

  const header = (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-medium text-foreground-secondary">次のイベント</h2>
      <a
        href="#calendar"
        className="text-xs text-foreground-secondary hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        カレンダーで探す
      </a>
    </div>
  );

  const body =
    events.length === 0 ? (
      <p className="text-sm text-foreground-secondary">今後の予定はありません</p>
    ) : frame === "plain" ? (
      <div className="divide-y divide-border-subtle">
        {groups.map((group) => (
          <div key={group.date} className="py-3 first:pt-0 last:pb-0">
            <p className="text-xs text-foreground-secondary">
              {formatMonthDayWithWeekday(group.date)}・あと
              {daysUntil(group.date, todayStr)}日
            </p>
            <ul className="mt-1 space-y-2.5">
              {group.events.map((event) => (
                <li key={eventKey(event)}>
                  <EventListItem event={event} variant="stacked" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    ) : (
      <ul className="space-y-3">
        {groups.map((group) => (
          <li key={group.date}>
            <p className="text-xs text-foreground-secondary">
              {formatMonthDayWithWeekday(group.date)}・あと
              {daysUntil(group.date, todayStr)}日
            </p>
            <ul className="mt-1 space-y-2.5">
              {group.events.map((event) => (
                <li key={eventKey(event)}>
                  <EventListItem event={event} variant="stacked" />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );

  if (frame === "plain") {
    return (
      <div>
        {header}
        {body}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-background p-4">
      {header}
      {body}
    </div>
  );
}
