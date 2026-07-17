import { describe, expect, it } from "vitest";
import type { MyAttendanceEntry } from "@/types/attendance";
import { OTHER_GROUP_ID, getAttendanceStats } from "@/usecases/getAttendanceStats";

const GROUP_A = { id: "group-a", nameJa: "グループA", color: "#ff0000" };
const GROUP_B = { id: "group-b", nameJa: "グループB", color: "#00ff00" };

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

const entries: MyAttendanceEntry[] = [
  makeEntry({
    id: "1",
    performanceDate: "2023-05-01",
    attendedType: "onsite",
    groups: [GROUP_A],
  }),
  makeEntry({
    id: "2",
    performanceDate: "2023-06-01",
    attendedType: "onsite",
    groups: [GROUP_B],
  }),
  makeEntry({
    id: "3",
    performanceDate: "2024-01-01",
    attendedType: "live_viewing",
    groups: [GROUP_A],
  }),
  makeEntry({
    id: "4",
    performanceDate: "2024-02-01",
    attendedType: "streaming",
    groups: [],
  }),
  makeEntry({
    id: "5",
    performanceDate: null,
    attendedType: "onsite",
    groups: [GROUP_A],
  }),
];

describe("getAttendanceStats", () => {
  it("フィルタなしの場合、年別件数を年昇順で集計し、日程未定は undatedCount に計上する", () => {
    const stats = getAttendanceStats(entries, {});

    expect(stats.yearlyCounts).toEqual([
      { year: 2023, count: 2 },
      { year: 2024, count: 2 },
    ]);
    expect(stats.undatedCount).toBe(1);
  });

  it("グループ別の延べ参加数を件数降順で集計し、グループ無しは「その他」にまとめる", () => {
    const stats = getAttendanceStats(entries, {});

    expect(stats.groupCounts).toEqual([
      { groupId: GROUP_A.id, groupNameJa: GROUP_A.nameJa, color: GROUP_A.color, count: 3 },
      { groupId: GROUP_B.id, groupNameJa: GROUP_B.nameJa, color: GROUP_B.color, count: 1 },
      { groupId: OTHER_GROUP_ID, groupNameJa: "その他", color: null, count: 1 },
    ]);
  });

  it("attendedTypeCounts は0件の種別も固定順で0埋めする", () => {
    const stats = getAttendanceStats(entries, {});

    expect(stats.attendedTypeCounts).toEqual([
      { attendedType: "onsite", count: 3 },
      { attendedType: "live_viewing", count: 1 },
      { attendedType: "streaming", count: 1 },
    ]);
  });

  it("グループで絞り込むと yearlyCounts はそのグループの参加のみで集計する（年フィルタは効かない）", () => {
    const stats = getAttendanceStats(entries, { groupId: GROUP_A.id });

    expect(stats.yearlyCounts).toEqual([
      { year: 2023, count: 1 },
      { year: 2024, count: 1 },
    ]);
    expect(stats.undatedCount).toBe(1);
  });

  it("年で絞り込むと groupCounts はその年の参加のみで集計する（グループフィルタは効かない）", () => {
    const stats = getAttendanceStats(entries, { year: 2023 });

    expect(stats.groupCounts).toEqual([
      { groupId: GROUP_A.id, groupNameJa: GROUP_A.nameJa, color: GROUP_A.color, count: 1 },
      { groupId: GROUP_B.id, groupNameJa: GROUP_B.nameJa, color: GROUP_B.color, count: 1 },
    ]);
  });

  it("年・グループ両方で絞り込むと attendedTypeCounts / filteredEntries は両方を反映する", () => {
    const stats = getAttendanceStats(entries, { year: 2024, groupId: GROUP_A.id });

    expect(stats.attendedTypeCounts).toEqual([
      { attendedType: "onsite", count: 0 },
      { attendedType: "live_viewing", count: 1 },
      { attendedType: "streaming", count: 0 },
    ]);
    expect(stats.filteredEntries.map((entry) => entry.id)).toEqual(["3"]);
  });

  it("availableYears / availableGroups / hasOtherGroupEntries はフィルタの影響を受けず全件から求める", () => {
    const stats = getAttendanceStats(entries, { year: 2023, groupId: GROUP_A.id });

    expect(stats.availableYears).toEqual([2024, 2023]);
    expect(stats.availableGroups).toEqual([
      { id: GROUP_A.id, nameJa: GROUP_A.nameJa },
      { id: GROUP_B.id, nameJa: GROUP_B.nameJa },
    ]);
    expect(stats.hasOtherGroupEntries).toBe(true);
  });
});
