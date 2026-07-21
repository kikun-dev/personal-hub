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

// "rail"（既定）= Desktop 右 rail の現行表示（#400 の DOM を維持）。
// "compact" = Mobile 本文内で縦密度を下げた表示（#396）。
// 表示件数の出し分け（Mobile 4 / Desktop 6）はこのコンポーネントではなく、
// 表示文脈を知る呼び出し側（page.tsx）が slice して渡す。
type NextEventsVariant = "rail" | "compact";

type NextEventsProps = {
  events: CalendarEvent[];
  today: Date;
  variant?: NextEventsVariant;
};

// Desktop 右側 rail（Next Events）と Mobile 本文内の両方で使う共通コンポーネント（#344）。
// 配置・表示切替はページ側（hidden lg:block / lg:hidden）で行う。
// #400: 見出しを「次の予定」に統一し、rail と mobile を枠付き surface + 区切り線で
// 揃える（design prototype の upcoming-rail / mobile-upcoming 相当）。
// #400 追補: prototype の per-item レイアウト（日付+バッジ同一行 / 主題独立行 / 補足 /
// あとN日を右下）に揃えるため、日付グルーピング（旧 groupByDate）を廃止し1イベント=1アイテムに
// する。rail/mobile で描画が同一になったため frame prop も廃止した。
// #396: Mobile の read density を下げるため variant="compact" を追加。compact では
// 「あとN日」を独立行から meta 行右端へ移し、縦 spacing を圧縮する（rail の DOM は不変）。
export function NextEvents({ events, today, variant = "rail" }: NextEventsProps) {
  const todayStr = toDateStr(today);
  const hasEvents = events.length > 0;
  const isCompact = variant === "compact";

  const header = (
    <h2
      className={`${isCompact ? "mb-2" : "mb-3"} text-sm font-medium text-foreground-secondary`}
    >
      次の予定
    </h2>
  );

  const body = !hasEvents ? (
    <p className="text-sm text-foreground-secondary">今後の予定はありません</p>
  ) : (
    <ul className="divide-y divide-border-subtle">
      {events.map((event) => {
        const presentation = getEventPresentation(event);
        const remainingDays = daysUntil(event.date, todayStr);

        if (isCompact) {
          // Mobile: 日付 + バッジ + 「あとN日」を1行に畳み、主題を独立行にする。
          // 320px でも競合しないよう、日付は min-w-0 truncate、あとN日は shrink-0。
          return (
            <li key={eventKey(event)} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <time className="min-w-0 truncate text-xs text-foreground-secondary">
                  {formatMonthDayWithWeekday(event.date)}
                </time>
                <Badge
                  label={presentation.badge.label}
                  color={presentation.badge.color}
                />
                <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-foreground-secondary">
                  あと{remainingDays}日
                </span>
              </div>
              <div className="mt-0.5 text-sm">{presentation.nameLink}</div>
              {presentation.details.length > 0 && (
                <p className="mt-0.5 text-xs text-foreground-secondary">
                  {presentation.details.map((d) => d.text).join(" ")}
                </p>
              )}
            </li>
          );
        }

        // rail（既定・#400 の DOM を維持）。
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
              あと{remainingDays}日
            </p>
          </li>
        );
      })}
    </ul>
  );

  // #400: rail / mobile とも枠付き surface に統一する。#400 追補2: すぐ下にカレンダーが
  // あるため「すべて見る」導線は冗長として廃止し、代わりに表示件数を増やす（usecase 側）。
  return (
    <div className="rounded-lg border border-border-subtle bg-background p-4">
      {header}
      {body}
    </div>
  );
}
