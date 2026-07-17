import { describe, expect, it } from "vitest";
import { buildCalendarCells, type CalendarCell } from "@/lib/calendarSemantics";
import type {
  CalendarEvent,
  Event,
  LiveCalendarEvent,
  ReleaseCalendarEvent,
} from "@/types/event";

function makeLiveEvent(date: string, id: string): LiveCalendarEvent {
  return {
    type: "live",
    id,
    performanceId: `${id}-performance`,
    liveId: `${id}-live`,
    name: "テストライブ",
    date,
    startsAt: null,
    venueName: null,
    performanceCount: 1,
  };
}

function makeReleaseEvent(date: string, id: string): ReleaseCalendarEvent {
  return {
    type: "release",
    id,
    releaseId: `${id}-release`,
    title: "テストリリース",
    date,
  };
}

function makeGenericEvent(
  date: string,
  id: string,
  eventTypeName: string
): Event & { type: "event" } {
  return {
    type: "event",
    id,
    eventTypeId: `${id}-type`,
    eventTypeName,
    eventTypeColor: "#000000",
    isMemberHistory: false,
    title: "テストイベント",
    description: "",
    date,
    endDate: null,
    startTime: null,
    venue: null,
    url: null,
    groupIds: [],
    groupNames: [],
    memberIds: [],
  };
}

function findCell(weeks: CalendarCell[][], dateStr: string): CalendarCell {
  const cell = weeks.flat().find((c) => c.dateStr === dateStr);
  if (!cell) {
    throw new Error(`cellが見つかりません: ${dateStr}`);
  }
  return cell;
}

describe("buildCalendarCells", () => {
  it("6週×7日=42セルを生成し、hrefはzero-padなしのquery形式になる", () => {
    const weeks = buildCalendarCells({
      year: 2026,
      month: 7,
      events: [],
      todayStr: "2026-07-17",
      selectedDateStr: "2026-07-17",
    });

    expect(weeks).toHaveLength(6);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }

    const cell = findCell(weeks, "2026-07-05");
    expect(cell.href).toBe("/?year=2026&month=7&day=5");
  });

  it("イベントが無い日はaccessibleNameに「イベント」を含まない", () => {
    const weeks = buildCalendarCells({
      year: 2026,
      month: 7,
      events: [],
      todayStr: "2026-07-01",
      selectedDateStr: "2026-07-01",
    });

    const cell = findCell(weeks, "2026-07-17");
    expect(cell.accessibleName).toBe("2026年7月17日");
    expect(cell.accessibleName).not.toContain("イベント");
  });

  it("1件のイベントは「イベント1件（種別N件）」の形式になる", () => {
    const events: CalendarEvent[] = [makeLiveEvent("2026-07-17", "live-1")];
    const weeks = buildCalendarCells({
      year: 2026,
      month: 7,
      events,
      todayStr: "2026-01-01",
      selectedDateStr: "2026-01-01",
    });

    const cell = findCell(weeks, "2026-07-17");
    expect(cell.accessibleName).toBe("2026年7月17日、イベント1件（ライブ1件）");
  });

  it("4件以上のイベントは固定種別順のあとにgeneric種別が出現順で続く", () => {
    const events: CalendarEvent[] = [
      makeLiveEvent("2026-07-17", "live-1"),
      makeLiveEvent("2026-07-17", "live-2"),
      makeReleaseEvent("2026-07-17", "release-1"),
      makeGenericEvent("2026-07-17", "event-1", "特典会"),
    ];
    const weeks = buildCalendarCells({
      year: 2026,
      month: 7,
      events,
      todayStr: "2026-01-01",
      selectedDateStr: "2026-01-01",
    });

    const cell = findCell(weeks, "2026-07-17");
    expect(cell.accessibleName).toBe(
      "2026年7月17日、イベント4件（ライブ2件、リリース1件、特典会1件）"
    );
  });

  it("同じlabelのgenericイベントは件数を合算する", () => {
    const events: CalendarEvent[] = [
      makeGenericEvent("2026-07-17", "event-1", "特典会"),
      makeGenericEvent("2026-07-17", "event-2", "特典会"),
    ];
    const weeks = buildCalendarCells({
      year: 2026,
      month: 7,
      events,
      todayStr: "2026-01-01",
      selectedDateStr: "2026-01-01",
    });

    const cell = findCell(weeks, "2026-07-17");
    expect(cell.accessibleName).toBe(
      "2026年7月17日、イベント2件（特典会2件）"
    );
  });

  it("前月/次月のセルは自身の正しい年月日でaccessibleNameを生成する（月・年跨ぎを含む）", () => {
    // 2026年1月グリッドの先頭週は前年12月の日を含む
    const weeks = buildCalendarCells({
      year: 2026,
      month: 1,
      events: [],
      todayStr: "2026-01-01",
      selectedDateStr: "2026-01-01",
    });

    const firstCell = weeks[0][0];
    expect(firstCell.isCurrentMonth).toBe(false);
    expect(firstCell.dateStr.startsWith("2025-12")).toBe(true);
    const [, , day] = firstCell.dateStr.split("-").map((v) => Number(v));
    expect(firstCell.accessibleName).toBe(`2025年12月${day}日`);

    const lastCell = weeks[5][6];
    expect(lastCell.isCurrentMonth).toBe(false);
    expect(lastCell.dateStr.startsWith("2026-02")).toBe(true);
  });

  it("todayStrに一致するセルのみisToday:trueになる", () => {
    const weeks = buildCalendarCells({
      year: 2026,
      month: 7,
      events: [],
      todayStr: "2026-07-17",
      selectedDateStr: "2026-01-01",
    });

    const todayCells = weeks.flat().filter((cell) => cell.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].dateStr).toBe("2026-07-17");
  });

  it("selectedDateStrに一致するセルのみisSelected:trueで、名前に「選択中」を含む", () => {
    const weeks = buildCalendarCells({
      year: 2026,
      month: 7,
      events: [],
      todayStr: "2026-01-01",
      selectedDateStr: "2026-07-05",
    });

    const selectedCells = weeks.flat().filter((cell) => cell.isSelected);
    expect(selectedCells).toHaveLength(1);
    expect(selectedCells[0].dateStr).toBe("2026-07-05");
    expect(selectedCells[0].accessibleName).toBe("2026年7月5日、選択中");
  });

  it("選択中かつイベントありの完全例", () => {
    const events: CalendarEvent[] = [
      makeLiveEvent("2026-07-17", "live-1"),
      makeReleaseEvent("2026-07-17", "release-1"),
      makeReleaseEvent("2026-07-17", "release-2"),
    ];
    const weeks = buildCalendarCells({
      year: 2026,
      month: 7,
      events,
      todayStr: "2026-01-01",
      selectedDateStr: "2026-07-17",
    });

    const cell = findCell(weeks, "2026-07-17");
    expect(cell.accessibleName).toBe(
      "2026年7月17日、選択中、イベント3件（ライブ1件、リリース2件）"
    );
  });
});
