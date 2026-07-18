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

const RECENT_ATTENDANCE_LIMIT = 3;

/**
 * 自分の過去の参加記録（performanceDate < 今日）を日付降順で先頭3件に絞る（#344）。
 * #366 で findAllForUser（全件取得 + JSでフィルタ・スライス）から
 * findRecentForUser（DB側で bounded に絞り込み）へ置換した。
 * getMyAttendanceHistory の thisYearPast は今年限定のため使わず、
 * ここでは年で絞らない全期間の直近実績を返す。
 */
export async function getRecentAttendance(
  repo: AttendanceRepository
): Promise<RecentAttendanceOverview> {
  const todayStr = getTodayDateStr();
  const entries = await repo.findRecentForUser(todayStr, RECENT_ATTENDANCE_LIMIT);

  return {
    entries,
    // findRecentForUser は「performance_date が非null かつ todayStr 未満」の行のみを
    // 対象に limit 件だけ返す。limit は件数を減らす方向にのみ働くため、
    // entries が1件以上あれば過去分が存在すること・0件なら存在しないことの
    // 両方をそのまま導出できる（追加の count query は不要）。
    hasAnyPastAttendance: entries.length > 0,
  };
}
