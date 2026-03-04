"use client";

import { useState } from "react";
import type { CalendarEvent } from "@/types/event";
import { generateCalendarGrid } from "@/lib/calendarUtils";
import { formatMonthLabel } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";

type EventCalendarProps = {
  events: CalendarEvent[];
  initialYear: number;
  initialMonth: number;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function EventCalendar({
  events,
  initialYear,
  initialMonth,
}: EventCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const weeks = generateCalendarGrid(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const existing = eventsByDate.get(event.date) ?? [];
    existing.push(event);
    eventsByDate.set(event.date, existing);
  }

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={prevMonth}>
          ←
        </Button>
        <h2 className="text-sm font-medium text-foreground">
          {formatMonthLabel(year, month)}
        </h2>
        <Button variant="ghost" onClick={nextMonth}>
          →
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-1 text-center text-xs font-medium ${
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-blue-400"
                  : "text-foreground/50"
            }`}
          >
            {day}
          </div>
        ))}

        {weeks.flat().map((day) => {
          const dayEvents = eventsByDate.get(day.dateStr) ?? [];
          const isToday = day.dateStr === todayStr;

          return (
            <div
              key={day.dateStr}
              className={`min-h-[40px] p-1 text-center ${
                day.isCurrentMonth
                  ? "text-foreground"
                  : "text-foreground/20"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-foreground font-bold text-background"
                    : ""
                }`}
              >
                {day.date}
              </span>
              {dayEvents.length > 0 && (
                <div className="mt-0.5 flex justify-center gap-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full"
                      style={{
                        backgroundColor:
                          e.type === "birthday"
                            ? "#D946EF"
                            : e.eventTypeColor,
                      }}
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
