import type { Event } from "@/types/event";
import { Badge } from "@/components/ui/Badge";

type OnThisDayProps = {
  events: Event[];
  today: Date;
};

export function OnThisDay({ events, today }: OnThisDayProps) {
  const currentYear = today.getFullYear();

  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <h2 className="mb-3 text-sm font-medium text-foreground/70">
        今日はなんの日
      </h2>

      {events.length === 0 ? (
        <p className="text-sm text-foreground/40">
          過去のイベントはありません
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const eventYear = new Date(event.date + "T00:00:00").getFullYear();
            const yearsAgo = currentYear - eventYear;

            return (
              <div key={event.id} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 text-xs font-medium text-foreground/50">
                  {yearsAgo}年前
                </span>
                <Badge
                  label={event.eventTypeName}
                  color={event.eventTypeColor}
                />
                <div>
                  <span className="text-foreground">{event.title}</span>
                  <span className="ml-1 text-xs text-foreground/40">
                    {event.groupNames.join(", ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
