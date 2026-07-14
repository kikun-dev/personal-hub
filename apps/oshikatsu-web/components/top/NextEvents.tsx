import Link from "next/link";
import type { CalendarEvent } from "@/types/event";
import { Badge } from "@/components/ui/Badge";
import { eventKey } from "@/components/events/EventListItem";
import { formatMonthDayWithWeekday, formatTime } from "@/lib/formatters";
import {
  BIRTHDAY_COLOR,
  LIVE_COLOR,
  RELEASE_COLOR,
  VIDEO_COLOR,
} from "@/lib/constants";

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

// Desktop 右側 rail（Next Events）と Mobile 本文内の両方で使う共通コンポーネント（#344）。
// 配置・表示切替はページ側（hidden lg:block / lg:hidden）で行う。
export function NextEvents({ events, today }: NextEventsProps) {
  const todayStr = toDateStr(today);

  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground/70">
          次のイベント
        </h2>
        <a
          href="#calendar"
          className="text-xs text-foreground/50 hover:text-foreground hover:underline"
        >
          すべて見る
        </a>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-foreground/40">今後の予定はありません</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={eventKey(event)} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0 text-xs text-foreground/50">
                {formatMonthDayWithWeekday(event.date)}
              </span>
              <div className="min-w-0 flex-1">
                {event.type === "live" ? (
                  <>
                    <Badge label="ライブ" color={LIVE_COLOR} />
                    <div>
                      <Link
                        href={`/lives/${event.liveId}`}
                        className="text-foreground hover:underline"
                      >
                        {event.name}
                      </Link>
                      {event.startsAt && (
                        <span className="ml-1 text-xs text-foreground/50">
                          {formatTime(event.startsAt)}
                        </span>
                      )}
                      {event.venueName && (
                        <span className="ml-1 text-xs text-foreground/40">
                          @ {event.venueName}
                        </span>
                      )}
                    </div>
                  </>
                ) : event.type === "release" ? (
                  <>
                    <Badge label="リリース" color={RELEASE_COLOR} />
                    <Link
                      href={`/releases/${event.releaseId}`}
                      className="text-foreground hover:underline"
                    >
                      {event.title}
                    </Link>
                  </>
                ) : event.type === "video" ? (
                  <>
                    <Badge label="動画" color={VIDEO_COLOR} />
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:underline"
                    >
                      {event.trackTitle}（{event.videoLabel}）
                    </a>
                  </>
                ) : event.type === "birthday" ? (
                  <>
                    <Badge label="誕生日" color={BIRTHDAY_COLOR} />
                    <Link
                      href={`/members/${event.memberId}`}
                      className="text-foreground hover:underline"
                    >
                      {event.memberName}
                    </Link>
                    {event.age !== null && (
                      <span className="ml-1 text-xs text-foreground/50">
                        ({event.age}歳)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Badge
                      label={event.eventTypeName}
                      color={event.eventTypeColor}
                    />
                    <span className="text-foreground">{event.title}</span>
                    {event.startTime && (
                      <span className="ml-1 text-xs text-foreground/50">
                        {formatTime(event.startTime)}
                      </span>
                    )}
                    {event.venue && (
                      <span className="ml-1 text-xs text-foreground/40">
                        @ {event.venue}
                      </span>
                    )}
                  </>
                )}
              </div>
              <span className="shrink-0 text-xs text-foreground/50">
                あと{daysUntil(event.date, todayStr)}日
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
