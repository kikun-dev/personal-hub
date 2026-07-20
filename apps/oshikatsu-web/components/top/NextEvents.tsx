import type { CalendarEvent } from "@/types/event";
import { Badge } from "@/components/ui/Badge";
import { eventKey, getEventPresentation } from "@/components/events/EventListItem";
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

type NextEventsProps = {
  events: CalendarEvent[];
  today: Date;
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
// #400 追補: prototype の per-item レイアウト（日付+バッジ同一行 / 主題独立行 / 補足 /
// あとN日を右下）に揃えるため、日付グルーピング（旧 groupByDate）を廃止し1イベント=1アイテムに
// する。rail/mobile で描画が同一になったため frame prop も廃止した。
export function NextEvents({ events, today }: NextEventsProps) {
  const todayStr = toDateStr(today);
  const hasEvents = events.length > 0;

  const header = (
    <h2 className="mb-3 text-sm font-medium text-foreground-secondary">次の予定</h2>
  );

  const body = !hasEvents ? (
    <p className="text-sm text-foreground-secondary">今後の予定はありません</p>
  ) : (
    <ul className="divide-y divide-border-subtle">
      {events.map((event) => {
        const presentation = getEventPresentation(event);
        return (
          <li key={eventKey(event)} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <time className="text-xs text-foreground-secondary">
                {formatMonthDayWithWeekday(event.date)}
              </time>
              <Badge
                label={presentation.badge.label}
                color={presentation.badge.color}
              />
            </div>
            <div className="mt-1 text-sm">{presentation.nameLink}</div>
            {presentation.details.length > 0 && (
              <p className="mt-0.5 text-xs text-foreground-secondary">
                {presentation.details.map((d) => d.text).join(" ")}
              </p>
            )}
            <p className="mt-0.5 text-right text-xs text-foreground-secondary">
              あと{daysUntil(event.date, todayStr)}日
            </p>
          </li>
        );
      })}
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
