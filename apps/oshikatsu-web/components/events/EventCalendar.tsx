import Link from "next/link";
import type { CalendarEvent } from "@/types/event";
import { generateCalendarGrid } from "@/lib/calendarUtils";
import {
  BIRTHDAY_COLOR,
  LIVE_COLOR,
  RELEASE_COLOR,
  VIDEO_COLOR,
} from "@/lib/constants";
import { getTodayInAppTimeZone } from "@/lib/dateParams";

function calendarEventColor(event: CalendarEvent): string {
  switch (event.type) {
    case "birthday":
      return BIRTHDAY_COLOR;
    case "live":
      return LIVE_COLOR;
    case "release":
      return RELEASE_COLOR;
    case "video":
      return VIDEO_COLOR;
    default:
      return event.eventTypeColor;
  }
}

type EventCalendarProps = {
  events: CalendarEvent[];
  year: number;
  month: number;
  selectedDateStr: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function EventCalendar({
  events,
  year,
  month,
  selectedDateStr,
}: EventCalendarProps) {
  const weeks = generateCalendarGrid(year, month);
  const today = getTodayInAppTimeZone();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const existing = eventsByDate.get(event.date) ?? [];
    existing.push(event);
    eventsByDate.set(event.date, existing);
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-background p-4">
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-1 text-center text-xs font-medium ${
              i === 0 ? "text-danger-text" : "text-foreground-secondary"
            }`}
          >
            {day}
          </div>
        ))}

        {weeks.flat().map((day) => {
          const dayEvents = eventsByDate.get(day.dateStr) ?? [];
          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === selectedDateStr;
          const [targetYear, targetMonth, targetDay] = day.dateStr
            .split("-")
            .map((v) => Number(v));
          const href = `/?year=${targetYear}&month=${targetMonth}&day=${targetDay}`;

          return (
            <div
              key={day.dateStr}
              className={`min-h-[40px] p-1 text-center ${
                day.isCurrentMonth
                  ? "text-foreground"
                  : "text-foreground-secondary"
              }`}
            >
              <Link
                href={href}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                  isSelected
                    ? "bg-foreground font-bold text-background"
                    : isToday
                      ? "ring-1 ring-border-strong"
                      : ""
                }`}
              >
                {day.date}
              </Link>
              {dayEvents.length > 0 && (
                <div className="mt-0.5 flex justify-center gap-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: calendarEventColor(e) }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
