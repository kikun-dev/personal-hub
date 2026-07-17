import { CalendarDateLink } from "@/components/events/CalendarDateLink";
import type { CalendarEvent } from "@/types/event";
import { buildCalendarCells } from "@/lib/calendarSemantics";
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

const WEEKDAYS = [
  { short: "日", full: "日曜日" },
  { short: "月", full: "月曜日" },
  { short: "火", full: "火曜日" },
  { short: "水", full: "水曜日" },
  { short: "木", full: "木曜日" },
  { short: "金", full: "金曜日" },
  { short: "土", full: "土曜日" },
];

export function EventCalendar({
  events,
  year,
  month,
  selectedDateStr,
}: EventCalendarProps) {
  const today = getTodayInAppTimeZone();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const weeks = buildCalendarCells({
    year,
    month,
    events,
    todayStr,
    selectedDateStr,
  });

  return (
    <div className="rounded-lg border border-border-subtle bg-background p-4">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">
          {year}年{month}月のカレンダー
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map((day, i) => (
              <th
                key={day.full}
                scope="col"
                className={`py-1 text-center text-xs font-medium ${
                  i === 0 ? "text-danger-text" : "text-foreground-secondary"
                }`}
              >
                <span aria-hidden="true">{day.short}</span>
                <span className="sr-only">{day.full}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].dateStr}>
              {week.map((cell) => (
                <td
                  key={cell.dateStr}
                  // heightはtable cellへ最小高として振る舞う。320pxで40px、390px以上で44pxを
                  // 維持する（hit areaはLink側のmin-hで確保するため、tdのpaddingは持たない）。
                  className={`h-10 min-[390px]:h-11 text-center ${
                    cell.isCurrentMonth
                      ? "text-foreground"
                      : "text-foreground-secondary"
                  }`}
                >
                  <CalendarDateLink
                    href={cell.href}
                    dateStr={cell.dateStr}
                    ariaLabel={cell.accessibleName}
                    ariaCurrent={cell.isToday ? "date" : undefined}
                    className="group flex min-h-10 min-[390px]:min-h-11 w-full flex-col items-center justify-center gap-0.5 focus-visible:outline-none"
                  >
                    {/* 24pxのvisual circleはhit area（Link全面）から分離し、focus/hover表現もここへ限定する */}
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors group-hover:bg-surface-subtle group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus-ring ${
                        cell.isSelected
                          ? "bg-foreground font-bold text-background"
                          : cell.isToday
                            ? "ring-1 ring-border-strong"
                            : ""
                      }`}
                    >
                      {cell.date}
                    </span>
                    {cell.events.length > 0 && (
                      <div aria-hidden="true" className="flex justify-center gap-0.5">
                        {cell.events.slice(0, 3).map((e, i) => (
                          <span
                            key={i}
                            className="h-1 w-1 rounded-full"
                            style={{ backgroundColor: calendarEventColor(e) }}
                          />
                        ))}
                      </div>
                    )}
                  </CalendarDateLink>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
