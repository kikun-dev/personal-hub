import type { CalendarEvent } from "@/types/event";
import { EventListItem, eventKey } from "@/components/events/EventListItem";

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
            <EventListItem key={eventKey(event)} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
