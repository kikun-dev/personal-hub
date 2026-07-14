import type { AttendanceRepository } from "@/types/repositories";
import type { MyAttendanceEntry } from "@/types/attendance";
import { getTodayInAppTimeZone } from "@/lib/dateParams";

// トップページ「最近の参加記録」（#344）用の表示区分。
export type RecentAttendanceOverview = {
  // 直近3件（過去分、日付降順）
  entries: MyAttendanceEntry[];
  // 過去の参加記録が1件もないか（UI の empty 文言出し分け用）
  hasAnyPastAttendance: boolean;
};

// マイページのカレンダーと同じ getTodayInAppTimeZone（Asia/Tokyo基準）で
// 「今日」を求め、performance_date（DATE列＝"YYYY-MM-DD"文字列）と文字列比較する。
function getTodayDateStr(): string {
  const today = getTodayInAppTimeZone();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 自分の参加記録全件（findAllForUser、降順で返る）から、過去分
 * （performanceDate < 今日）を日付降順で先頭3件に絞る（#344）。
 * getMyAttendanceHistory の thisYearPast は今年限定のため使わず、
 * ここでは年で絞らない全期間の直近実績を返す。
 */
export async function getRecentAttendance(
  repo: AttendanceRepository
): Promise<RecentAttendanceOverview> {
  const entries = await repo.findAllForUser();
  const todayStr = getTodayDateStr();

  // repository は日付降順（新しい順、日程未定は末尾）で返すため、フィルタのみで
  // 順序はそのまま活かせる。
  const pastEntries = entries.filter(
    (entry) => entry.performanceDate !== null && entry.performanceDate < todayStr
  );

  return {
    entries: pastEntries.slice(0, 3),
    hasAnyPastAttendance: pastEntries.length > 0,
  };
}
