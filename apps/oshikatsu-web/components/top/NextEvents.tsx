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
};

// Desktop 右側 rail（Next Events）と Mobile 本文内の両方で使う共通コンポーネント（#344）。
// 配置・表示切替はページ側（hidden lg:block / lg:hidden）で行う。
export function NextEvents({ events, today }: NextEventsProps) {
  const todayStr = toDateStr(today);
  const groups = groupByDate(events);

  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground/70">
          次のイベント
        </h2>
        <a
          href="#calendar"
          className="text-xs text-foreground/60 hover:text-foreground hover:underline"
        >
          カレンダーで探す
        </a>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-foreground/60">今後の予定はありません</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li key={group.date}>
              <p className="text-xs text-foreground/60">
                {formatMonthDayWithWeekday(group.date)}・あと
                {daysUntil(group.date, todayStr)}日
              </p>
              <ul className="mt-1 space-y-1.5">
                {group.events.map((event) => (
                  <li key={eventKey(event)} className="text-sm">
                    {event.type === "live" ? (
                      <>
                        <Badge label="ライブ" color={LIVE_COLOR} />
                        <Link
                          href={`/lives/${event.liveId}`}
                          className="text-foreground hover:underline"
                        >
                          {event.name}
                        </Link>
                        {event.startsAt && (
                          <span className="ml-1 text-xs text-foreground/60">
                            {formatTime(event.startsAt)}
                          </span>
                        )}
                        {event.performanceCount > 1 && (
                          <span className="ml-1 text-xs text-foreground/60">
                            全{event.performanceCount}公演
                          </span>
                        )}
                        {event.venueName && (
                          <span className="ml-1 text-xs text-foreground/60">
                            @ {event.venueName}
                          </span>
                        )}
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
                          <span className="ml-1 text-xs text-foreground/60">
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
                          <span className="ml-1 text-xs text-foreground/60">
                            {formatTime(event.startTime)}
                          </span>
                        )}
                        {event.venue && (
                          <span className="ml-1 text-xs text-foreground/60">
                            @ {event.venue}
                          </span>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
