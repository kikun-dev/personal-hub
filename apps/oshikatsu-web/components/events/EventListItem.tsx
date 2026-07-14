import Link from "next/link";
import type { CalendarEvent } from "@/types/event";
import { Badge } from "@/components/ui/Badge";
import { formatTime } from "@/lib/formatters";
import {
  BIRTHDAY_COLOR,
  LIVE_COLOR,
  RELEASE_COLOR,
  VIDEO_COLOR,
} from "@/lib/constants";

export function eventKey(event: CalendarEvent): string {
  switch (event.type) {
    case "birthday":
      return `birthday-${event.memberId}-${event.date}`;
    case "live":
    case "release":
      return `${event.type}-${event.id}`;
    default:
      return `event-${event.id}`;
  }
}

type EventListItemProps = {
  event: CalendarEvent;
};

// イベント一覧の1行分の表示（EventList / TodaySchedule で共用）。
// バッジ・リンク・補足の組み立ては元々 EventList.tsx にあったものを抽出した（#344）。
export function EventListItem({ event }: EventListItemProps) {
  return (
    <div className="flex items-start gap-2 text-sm">
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
              <span className="ml-1 text-foreground/50">
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
          <div>
            <Link
              href={`/members/${event.memberId}`}
              className="text-foreground hover:underline"
            >
              {event.memberName}
            </Link>
            {event.age !== null && (
              <span className="ml-1 text-foreground/50">
                ({event.age}歳)
              </span>
            )}
            <span className="ml-1 text-xs text-foreground/40">
              {event.groupNames.join(", ")}
            </span>
          </div>
        </>
      ) : (
        <>
          <Badge label={event.eventTypeName} color={event.eventTypeColor} />
          <div>
            <span className="text-foreground">{event.title}</span>
            {event.startTime && (
              <span className="ml-1 text-foreground/50">
                {formatTime(event.startTime)}
              </span>
            )}
            {event.venue && (
              <span className="ml-1 text-xs text-foreground/40">
                @ {event.venue}
              </span>
            )}
            <span className="ml-1 text-xs text-foreground/40">
              {event.groupNames.join(", ")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
