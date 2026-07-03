import type { AttendedType, MyAttendanceEntry } from "@/types/attendance";
import { ATTENDED_TYPE_VALUES } from "@/types/attendance";

// 出演グループが無いライブ（単独グループのライブでグループ紐付けが未設定など）を
// まとめる擬似グループのID。実グループIDと衝突しないよう固定文字列にする。
export const OTHER_GROUP_ID = "other";
const OTHER_GROUP_LABEL = "その他";

export type AttendanceStatsFilters = {
  year?: number;
  groupId?: string;
};

export type YearlyCount = {
  year: number;
  count: number;
};

export type GroupCount = {
  groupId: string;
  groupNameJa: string;
  // 実グループは orbit_groups.color、「その他」は色指定なし（チャート側で既定色を使う）。
  color: string | null;
  count: number;
};

export type AttendedTypeCount = {
  attendedType: AttendedType;
  count: number;
};

export type GroupOption = {
  id: string;
  nameJa: string;
};

export type AttendanceStats = {
  // 年別の参加数（performance_date の年。日付未定は含まない）。年昇順。
  // グループで絞り込んでいる場合はそのグループが絡む参加のみを集計する
  // （年フィルタでは絞り込まない＝常に全期間を表示、Issue #248 Design notes 論点1）。
  yearlyCounts: YearlyCount[];
  // yearlyCounts の集計対象外になった、日程未定の参加数。
  undatedCount: number;
  // グループ別の延べ参加数（1公演に複数グループ出演なら各グループに1カウント）。
  // 年で絞り込んでいる場合はその年の参加のみを集計する。件数降順。
  groupCounts: GroupCount[];
  // 参加種別ごとの件数。年・グループ両方の絞り込みを反映する。ATTENDED_TYPE_VALUES の順。
  attendedTypeCounts: AttendedTypeCount[];
  // 年・グループ両方の絞り込みを適用した一覧（表示用）。日付降順は入力の並びを維持する。
  filteredEntries: MyAttendanceEntry[];
  // 絞り込みセレクトの選択肢。フィルタの影響を受けず、全件から求める。
  availableYears: number[];
  availableGroups: GroupOption[];
  hasOtherGroupEntries: boolean;
};

function getYear(entry: MyAttendanceEntry): number | null {
  if (!entry.performanceDate) return null;
  const year = Number(entry.performanceDate.slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

function matchesGroup(entry: MyAttendanceEntry, groupId: string | undefined): boolean {
  if (!groupId) return true;
  if (groupId === OTHER_GROUP_ID) return entry.groups.length === 0;
  return entry.groups.some((group) => group.id === groupId);
}

function matchesYear(entry: MyAttendanceEntry, year: number | undefined): boolean {
  if (year === undefined) return true;
  return getYear(entry) === year;
}

function buildYearlyCounts(entries: MyAttendanceEntry[]): {
  yearlyCounts: YearlyCount[];
  undatedCount: number;
} {
  const counts = new Map<number, number>();
  let undatedCount = 0;

  for (const entry of entries) {
    const year = getYear(entry);
    if (year === null) {
      undatedCount += 1;
      continue;
    }
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  const yearlyCounts = [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  return { yearlyCounts, undatedCount };
}

function buildGroupCounts(entries: MyAttendanceEntry[]): GroupCount[] {
  const counts = new Map<string, GroupCount>();

  for (const entry of entries) {
    if (entry.groups.length === 0) {
      const existing = counts.get(OTHER_GROUP_ID);
      counts.set(OTHER_GROUP_ID, {
        groupId: OTHER_GROUP_ID,
        groupNameJa: OTHER_GROUP_LABEL,
        color: null,
        count: (existing?.count ?? 0) + 1,
      });
      continue;
    }

    // 出演グループ全てに1カウント（延べ）。Issue #248 Design notes 論点2の決定。
    for (const group of entry.groups) {
      const existing = counts.get(group.id);
      counts.set(group.id, {
        groupId: group.id,
        groupNameJa: group.nameJa,
        color: group.color,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function buildAttendedTypeCounts(entries: MyAttendanceEntry[]): AttendedTypeCount[] {
  const counts = new Map<AttendedType, number>();
  for (const entry of entries) {
    counts.set(entry.attendedType, (counts.get(entry.attendedType) ?? 0) + 1);
  }

  // 0件の種別もバッジとして出せるよう、固定順で全種別を含める。
  return ATTENDED_TYPE_VALUES.map((attendedType) => ({
    attendedType,
    count: counts.get(attendedType) ?? 0,
  }));
}

function buildAvailableYears(entries: MyAttendanceEntry[]): number[] {
  const years = new Set<number>();
  for (const entry of entries) {
    const year = getYear(entry);
    if (year !== null) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

function buildAvailableGroups(entries: MyAttendanceEntry[]): {
  availableGroups: GroupOption[];
  hasOtherGroupEntries: boolean;
} {
  const groups = new Map<string, GroupOption>();
  let hasOtherGroupEntries = false;

  for (const entry of entries) {
    if (entry.groups.length === 0) {
      hasOtherGroupEntries = true;
      continue;
    }
    for (const group of entry.groups) {
      if (!groups.has(group.id)) {
        groups.set(group.id, { id: group.id, nameJa: group.nameJa });
      }
    }
  }

  const availableGroups = [...groups.values()].sort((a, b) =>
    a.nameJa.localeCompare(b.nameJa, "ja")
  );

  return { availableGroups, hasOtherGroupEntries };
}

/**
 * マイページの参加記録（#247 read model）から、年別・グループ別・参加種別の集計と
 * 絞り込み後の一覧を求める（Issue #248）。
 *
 * フィルタの効き方（AC「年やグループで絞り込むと一覧・集計が連動する」の具体化）:
 * - yearlyCounts: グループフィルタのみ反映（年別の推移を常に全期間表示するため、
 *   Design notes 論点1の「バーは全期間表示」の決定に従う）
 * - groupCounts: 年フィルタのみ反映（グループ別の内訳を保つため）
 * - attendedTypeCounts / filteredEntries: 年・グループ両方を反映
 * - availableYears / availableGroups（セレクトの選択肢）: フィルタの影響を受けず全件から求める
 */
export function getAttendanceStats(
  entries: MyAttendanceEntry[],
  filters: AttendanceStatsFilters
): AttendanceStats {
  const byGroupOnly = entries.filter((entry) => matchesGroup(entry, filters.groupId));
  const byYearOnly = entries.filter((entry) => matchesYear(entry, filters.year));
  const filteredEntries = entries.filter(
    (entry) => matchesYear(entry, filters.year) && matchesGroup(entry, filters.groupId)
  );

  const { yearlyCounts, undatedCount } = buildYearlyCounts(byGroupOnly);
  const groupCounts = buildGroupCounts(byYearOnly);
  const attendedTypeCounts = buildAttendedTypeCounts(filteredEntries);
  const { availableGroups, hasOtherGroupEntries } = buildAvailableGroups(entries);

  return {
    yearlyCounts,
    undatedCount,
    groupCounts,
    attendedTypeCounts,
    filteredEntries,
    availableYears: buildAvailableYears(entries),
    availableGroups,
    hasOtherGroupEntries,
  };
}
