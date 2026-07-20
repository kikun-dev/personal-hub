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

// 底部の全件導線（rail / mobile 共通）。遷移先は現行の #calendar アンカーを維持し、
// 全件一覧ページは作らない（#400 Decision Option B）。ヘッダ右にあった重複リンクは
// 廃止しこちらへ一本化する。矢印はコードベース既存パターン（MonthSelector/LiveDetail の
// 「→」文字）を踏襲し、新規アイコンは追加しない。
function ViewAllLink() {
  return (
    <a
      href="#calendar"
      className="block w-full border-t border-border-subtle px-4 py-2.5 text-center text-xs text-foreground-secondary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      次の予定をすべて見る →
    </a>
  );
}

// Desktop 右側 rail（Next Events）と Mobile 本文内の両方で使う共通コンポーネント（#344）。
// 配置・表示切替はページ側（hidden lg:block / lg:hidden）で行う。
// #400: 見出しを「次の予定」に統一し、rail と mobile を枠付き surface + 区切り線 +
// 底部の全件導線で揃える（design prototype の upcoming-rail / mobile-upcoming 相当）。
export function NextEvents({ events, today, frame = "card" }: NextEventsProps) {
  const todayStr = toDateStr(today);
  const groups = groupByDate(events);
  const hasEvents = events.length > 0;

  const header = (
    <h2 className="mb-3 text-sm font-medium text-foreground-secondary">次の予定</h2>
  );

  const body = !hasEvents ? (
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
    // #400: 日付グループ間を区切り線で分ける（従来の space-y-3 から divide-y へ）。
    <ul className="divide-y divide-border-subtle">
      {groups.map((group) => (
        <li key={group.date} className="py-3 first:pt-0 last:pb-0">
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

  // #400: rail（card）/ mobile（plain）とも枠付き surface に統一し、#399 の DaySchedule と
  // 同様に「本文 padding」と「border-t の全件導線」を分けた構造にする
  // （events が 0 件のときは遷移先が空になるため導線を出さない）。
  return (
    <div className="rounded-lg border border-border-subtle bg-background">
      <div className="p-4">
        {header}
        {body}
      </div>
      {hasEvents && <ViewAllLink />}
    </div>
  );
}
