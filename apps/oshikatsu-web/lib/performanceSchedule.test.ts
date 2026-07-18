import { describe, expect, it } from "vitest";
import { formatScheduleLine, formatScheduleTime } from "@/lib/performanceSchedule";
import type { LivePerformance } from "@/types/live";

function makePerformance(overrides: Partial<LivePerformance> = {}): LivePerformance {
  return {
    id: "performance-1",
    venueId: null,
    venueName: null,
    venuePrefecture: null,
    performanceDate: "2026-06-13",
    doorsOpenAt: null,
    startsAt: null,
    hasStreaming: false,
    hasLiveViewing: false,
    sortOrder: 0,
    absences: [],
    setlistItems: [],
    ...overrides,
  };
}

describe("formatScheduleLine", () => {
  it("同一日でstartsAtが異なる2公演のlabelは相異なる", () => {
    const matinee = makePerformance({ id: "matinee", startsAt: "13:00" });
    const evening = makePerformance({ id: "evening", startsAt: "18:00" });

    const matineeLabel = formatScheduleLine("single", matinee);
    const eveningLabel = formatScheduleLine("single", evening);

    expect(matineeLabel).not.toBe(eveningLabel);
    expect(matineeLabel).toBe("6/13(土) 開演 13:00");
    expect(eveningLabel).toBe("6/13(土) 開演 18:00");
  });

  it("online種別は「配信 HH:MM」になる", () => {
    const performance = makePerformance({ startsAt: "19:00", doorsOpenAt: "18:30" });
    expect(formatScheduleLine("online", performance)).toBe("6/13(土) 配信 19:00");
  });

  it("festival種別は「出演 HH:MM」になる", () => {
    const performance = makePerformance({ startsAt: "15:30", doorsOpenAt: "10:00" });
    expect(formatScheduleLine("festival", performance)).toBe("6/13(土) 出演 15:30");
  });

  it("通常ライブはdoorsOpenAt/startsAtが揃うと「開場 x / 開演 y」になる", () => {
    const performance = makePerformance({ doorsOpenAt: "17:00", startsAt: "18:00" });
    expect(formatScheduleLine("single", performance)).toBe(
      "6/13(土) 開場 17:00 / 開演 18:00"
    );
  });

  it("時刻が無い場合は日付のみになる", () => {
    const performance = makePerformance({ doorsOpenAt: null, startsAt: null });
    expect(formatScheduleLine("single", performance)).toBe("6/13(土)");
  });

  it("performanceDateがnullの場合は「日付未定」になる", () => {
    const performance = makePerformance({ performanceDate: null });
    expect(formatScheduleLine("single", performance)).toBe("日付未定");
  });
});

describe("formatScheduleTime", () => {
  it("online種別はstartsAtが無ければnullを返す（開場は出さない）", () => {
    expect(formatScheduleTime("online", "18:00", null)).toBeNull();
  });

  it("festival種別はstartsAtが無ければnullを返す（開場は出さない）", () => {
    expect(formatScheduleTime("festival", "10:00", null)).toBeNull();
  });

  it("通常ライブでstartsAtのみあれば「開演 y」になる", () => {
    expect(formatScheduleTime("single", null, "18:00")).toBe("開演 18:00");
  });

  it("通常ライブでdoorsOpenAtのみあれば「開場 x」になる", () => {
    expect(formatScheduleTime("single", "17:00", null)).toBe("開場 17:00");
  });

  it("両方無ければnullを返す", () => {
    expect(formatScheduleTime("single", null, null)).toBeNull();
  });
});
