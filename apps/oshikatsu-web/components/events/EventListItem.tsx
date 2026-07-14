import type { ReactNode } from "react";
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
  // "inline"（デフォルト）= 現行レイアウト（バッジ+名称+補足を1行に並べる）。
  // "stacked" = 主行（バッジ+名称）/ 補助行（補足をまとめた1行）の2行構成（#344 レビュー対応）。
  variant?: "inline" | "stacked";
};

// 補足の1断片。emphasis は inline 表示時のクラス分けに使う
// （"primary" = 時刻など先頭の断片で text-foreground/60、"secondary" = それ以外で text-xs 付き）。
type DetailPart = {
  key: string;
  text: string;
  emphasis: "primary" | "secondary";
};

// 種別ごとのバッジ・リンク要素・補足の組み立てを1か所に集約し、inline/stacked 両 variant で
// 共有する（#344 レビュー対応: レイアウトのみを variant で分岐させ、分岐の重複を無くす）。
// hasDetailsContainer: inline 表示で名称+補足を <div> で包むかどうか（release/video は包まない、
// live/birthday/event は補足が0件でも包む＝現行 DOM 維持のため details.length とは独立の指定）。
type EventPresentation = {
  badge: { label: string; color: string };
  nameLink: ReactNode;
  hasDetailsContainer: boolean;
  details: DetailPart[];
};

function getEventPresentation(event: CalendarEvent): EventPresentation {
  switch (event.type) {
    case "live": {
      const details: DetailPart[] = [];
      if (event.startsAt) {
        details.push({
          key: "time",
          text: formatTime(event.startsAt),
          emphasis: "primary",
        });
      }
      if (event.performanceCount > 1) {
        details.push({
          key: "count",
          text: `全${event.performanceCount}公演`,
          emphasis: "secondary",
        });
      }
      if (event.venueName) {
        details.push({
          key: "venue",
          text: `@ ${event.venueName}`,
          emphasis: "secondary",
        });
      }
      return {
        badge: { label: "ライブ", color: LIVE_COLOR },
        nameLink: (
          <Link
            href={`/lives/${event.liveId}`}
            className="text-foreground hover:underline"
          >
            {event.name}
          </Link>
        ),
        hasDetailsContainer: true,
        details,
      };
    }
    case "release":
      return {
        badge: { label: "リリース", color: RELEASE_COLOR },
        nameLink: (
          <Link
            href={`/releases/${event.releaseId}`}
            className="text-foreground hover:underline"
          >
            {event.title}
          </Link>
        ),
        hasDetailsContainer: false,
        details: [],
      };
    case "video":
      return {
        badge: { label: "動画", color: VIDEO_COLOR },
        nameLink: (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline"
          >
            {event.trackTitle}（{event.videoLabel}）
          </a>
        ),
        hasDetailsContainer: false,
        details: [],
      };
    case "birthday": {
      const details: DetailPart[] = [];
      if (event.age !== null) {
        details.push({
          key: "age",
          text: `(${event.age}歳)`,
          emphasis: "primary",
        });
      }
      details.push({
        key: "groups",
        text: event.groupNames.join(", "),
        emphasis: "secondary",
      });
      return {
        badge: { label: "誕生日", color: BIRTHDAY_COLOR },
        nameLink: (
          <Link
            href={`/members/${event.memberId}`}
            className="text-foreground hover:underline"
          >
            {event.memberName}
          </Link>
        ),
        hasDetailsContainer: true,
        details,
      };
    }
    case "event": {
      const details: DetailPart[] = [];
      if (event.startTime) {
        details.push({
          key: "time",
          text: formatTime(event.startTime),
          emphasis: "primary",
        });
      }
      if (event.venue) {
        details.push({
          key: "venue",
          text: `@ ${event.venue}`,
          emphasis: "secondary",
        });
      }
      details.push({
        key: "groups",
        text: event.groupNames.join(", "),
        emphasis: "secondary",
      });
      return {
        badge: { label: event.eventTypeName, color: event.eventTypeColor },
        nameLink: <span className="text-foreground">{event.title}</span>,
        hasDetailsContainer: true,
        details,
      };
    }
  }
}

function InlineDetailSpan({ detail }: { detail: DetailPart }) {
  return (
    <span
      className={
        detail.emphasis === "primary"
          ? "ml-1 text-foreground/60"
          : "ml-1 text-xs text-foreground/60"
      }
    >
      {detail.text}
    </span>
  );
}

// イベント一覧の1行分の表示（DaySchedule / NextEvents / PastSameDay で共用）。
// バッジ・リンク・補足の組み立ては元々 EventList.tsx にあったものを抽出した（#344）。
export function EventListItem({
  event,
  variant = "inline",
}: EventListItemProps) {
  const presentation = getEventPresentation(event);

  if (variant === "stacked") {
    return (
      <div className="text-sm">
        <div className="flex items-center gap-2">
          <Badge
            label={presentation.badge.label}
            color={presentation.badge.color}
          />
          {presentation.nameLink}
        </div>
        {presentation.details.length > 0 && (
          <p className="mt-0.5 text-xs text-foreground/60">
            {presentation.details.map((d) => d.text).join(" ")}
          </p>
        )}
      </div>
    );
  }

  // inline（デフォルト・現行維持）: hasDetailsContainer が true の種別のみ <div> で包む。
  return (
    <div className="flex items-start gap-2 text-sm">
      <Badge label={presentation.badge.label} color={presentation.badge.color} />
      {presentation.hasDetailsContainer ? (
        <div>
          {presentation.nameLink}
          {presentation.details.map((d) => (
            <InlineDetailSpan key={d.key} detail={d} />
          ))}
        </div>
      ) : (
        presentation.nameLink
      )}
    </div>
  );
}
