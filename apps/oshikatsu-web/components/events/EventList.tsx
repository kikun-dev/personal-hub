import Link from "next/link";
import type { CalendarEvent } from "@/types/event";
import { Badge } from "@/components/ui/Badge";
import { formatTime } from "@/lib/formatters";
import { BIRTHDAY_COLOR } from "@/lib/constants";

type EventListProps = {
  events: CalendarEvent[];
  title: string;
  emptyMessage?: string;
};

export function EventList({
  events,
  title,
  emptyMessage = "イベントはありません",
}: EventListProps) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <h2 className="mb-3 text-sm font-medium text-foreground/70">{title}</h2>

      {events.length === 0 ? (
        <p className="text-sm text-foreground/40">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.type === "birthday" ? `birthday-${event.memberId}-${event.date}` : `event-${event.id}`} className="flex items-start gap-2 text-sm">
              {event.type === "birthday" ? (
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
                  <Badge
                    label={event.eventTypeName}
                    color={event.eventTypeColor}
                  />
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
          ))}
        </div>
      )}
    </div>
  );
}
