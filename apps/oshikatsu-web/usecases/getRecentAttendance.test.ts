import { describe, expect, it, vi } from "vitest";
import type { AttendanceRepository } from "@/types/repositories";
import type { MyAttendanceEntry } from "@/types/attendance";
import { getTodayInAppTimeZone } from "@/lib/dateParams";
import { getRecentAttendance } from "@/usecases/getRecentAttendance";

// getRecentAttendance内部の（非公開）getTodayDateStrと同じ導出方法をテスト側でも使い、
// 期待値をハードコードせず実行時の「今日」から求める（Asia/Tokyo基準、getTodayInAppTimeZone参照）。
function expectedTodayDateStr(): string {
  const today = getTodayInAppTimeZone();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeEntry(overrides: Partial<MyAttendanceEntry> & { id: string }): MyAttendanceEntry {
  return {
    attendedType: "onsite",
    seatNote: null,
    note: null,
    performanceId: `performance-${overrides.id}`,
    performanceDate: null,
    startsAt: null,
    liveId: `live-${overrides.id}`,
    liveName: "ライブ",
    liveType: "single",
    venueId: null,
    venueName: null,
    venuePrefecture: null,
    groups: [],
    ...overrides,
  };
}

// #366: getRecentAttendance が呼ぶのは findRecentForUser のみ。他のmethodは呼ばれない前提のため
// 未使用methodはvi.fn()のダミーで埋め、findRecentForUserだけ差し替え可能にする。
function createStubRepo(
  findRecentForUser: AttendanceRepository["findRecentForUser"]
): AttendanceRepository {
  return {
    findByPerformanceIds: vi.fn(),
    findAllForUser: vi.fn(),
    findRecentForUser,
    findSongEncounters: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

describe("getRecentAttendance", () => {
  it("findRecentForUser を beforeDateStr=今日(Asia/Tokyo基準)・limit=3で1回だけ呼ぶ", async () => {
    const findRecentForUser = vi.fn().mockResolvedValue([]);
    const repo = createStubRepo(findRecentForUser);

    await getRecentAttendance(repo);

    expect(findRecentForUser).toHaveBeenCalledTimes(1);
    expect(findRecentForUser).toHaveBeenCalledWith(expectedTodayDateStr(), 3);
  });

  it("0件: entriesは空配列、hasAnyPastAttendanceはfalse", async () => {
    const findRecentForUser = vi.fn().mockResolvedValue([]);
    const repo = createStubRepo(findRecentForUser);

    const result = await getRecentAttendance(repo);

    expect(result.entries).toEqual([]);
    expect(result.hasAnyPastAttendance).toBe(false);
    expect(findRecentForUser).toHaveBeenCalledTimes(1);
  });

  it("1件: entriesはその1件、hasAnyPastAttendanceはtrue", async () => {
    const entry = makeEntry({ id: "1", performanceDate: "2026-07-01" });
    const findRecentForUser = vi.fn().mockResolvedValue([entry]);
    const repo = createStubRepo(findRecentForUser);

    const result = await getRecentAttendance(repo);

    expect(result.entries).toEqual([entry]);
    expect(result.hasAnyPastAttendance).toBe(true);
    expect(findRecentForUser).toHaveBeenCalledTimes(1);
  });

  it("3件: repoの返却順のままentriesに反映され（日付降順はrepo側の責務）、hasAnyPastAttendanceはtrue", async () => {
    const entries = [
      makeEntry({ id: "1", performanceDate: "2026-07-18" }),
      makeEntry({ id: "2", performanceDate: "2026-07-01" }),
      makeEntry({ id: "3", performanceDate: "2025-12-31" }),
    ];
    const findRecentForUser = vi.fn().mockResolvedValue(entries);
    const repo = createStubRepo(findRecentForUser);

    const result = await getRecentAttendance(repo);

    // usecase側で再ソートしないため、stubが返した順序がそのまま出力される
    expect(result.entries.map((e) => e.id)).toEqual(["1", "2", "3"]);
    expect(result.hasAnyPastAttendance).toBe(true);
    expect(findRecentForUser).toHaveBeenCalledTimes(1);
  });
});
