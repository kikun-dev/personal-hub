import { generateCalendarGrid } from "@/lib/calendarUtils";
import type { CalendarEvent } from "@/types/event";

export type CalendarCell = {
  date: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  href: string;
  accessibleName: string;
  events: CalendarEvent[];
};

type BuildCalendarCellsParams = {
  year: number;
  month: number;
  events: CalendarEvent[];
  todayStr: string;
  selectedDateStr: string;
};

// 固定種別（この順で先に集計する）。genericな "event" 型は eventTypeName を
// labelとして、出現順で固定種別のあとに続ける（#361 accessibleName契約）。
const FIXED_TYPE_LABELS: ReadonlyArray<{
  type: "live" | "release" | "video" | "birthday";
  label: string;
}> = [
  { type: "live", label: "ライブ" },
  { type: "release", label: "リリース" },
  { type: "video", label: "動画" },
  { type: "birthday", label: "誕生日" },
];

function buildEventCountLabel(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return "";
  }

  const countsByLabel = new Map<string, number>();

  for (const { type, label } of FIXED_TYPE_LABELS) {
    const count = events.filter((event) => event.type === type).length;
    if (count > 0) {
      countsByLabel.set(label, count);
    }
  }

  for (const event of events) {
    if (event.type === "event") {
      const label = event.eventTypeName;
      countsByLabel.set(label, (countsByLabel.get(label) ?? 0) + 1);
    }
  }

  const breakdown = [...countsByLabel.entries()]
    .map(([label, count]) => `${label}${count}件`)
    .join("、");

  return `イベント${events.length}件（${breakdown}）`;
}

function buildAccessibleName(params: {
  year: number;
  month: number;
  date: number;
  isSelected: boolean;
  events: CalendarEvent[];
}): string {
  const { year, month, date, isSelected, events } = params;

  let name = `${year}年${month}月${date}日`;
  if (isSelected) {
    name += "、選択中";
  }
  const eventLabel = buildEventCountLabel(events);
  if (eventLabel) {
    name += `、${eventLabel}`;
  }
  return name;
}

/**
 * EventCalendar描画用のsemantic DTOを構築する（pure function）。
 * todayの算出はここでは行わず、呼び出し側が todayStr を渡す。
 */
export function buildCalendarCells({
  year,
  month,
  events,
  todayStr,
  selectedDateStr,
}: BuildCalendarCellsParams): CalendarCell[][] {
  const weeks = generateCalendarGrid(year, month);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const existing = eventsByDate.get(event.date) ?? [];
    existing.push(event);
    eventsByDate.set(event.date, existing);
  }

  return weeks.map((week) =>
    week.map((day) => {
      const [cellYear, cellMonth, cellDate] = day.dateStr
        .split("-")
        .map((value) => Number(value));
      const dayEvents = eventsByDate.get(day.dateStr) ?? [];
      const isToday = day.dateStr === todayStr;
      const isSelected = day.dateStr === selectedDateStr;

      return {
        date: day.date,
        dateStr: day.dateStr,
        isCurrentMonth: day.isCurrentMonth,
        isToday,
        isSelected,
        href: `/?year=${cellYear}&month=${cellMonth}&day=${cellDate}`,
        accessibleName: buildAccessibleName({
          year: cellYear,
          month: cellMonth,
          date: cellDate,
          isSelected,
          events: dayEvents,
        }),
        events: dayEvents,
      };
    })
  );
}
