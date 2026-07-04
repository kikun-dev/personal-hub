import type { AttendanceRepository } from "@/types/repositories";
import type { MyAttendanceEntry } from "@/types/attendance";
import { getTodayInAppTimeZone } from "@/lib/dateParams";

// マイページ（#263 再構成）のサマリー + 表示区分。
export type MyAttendanceOverview = {
  summary: {
    // 今日以降（当日含む）の参戦数
    upcomingCount: number;
    // 今年（未来含む）の参戦数。日程未定は除外
    thisYearCount: number;
    // 全参戦記録数（日程未定を含む）
    totalCount: number;
  };
  // 直近の1件（upcoming先頭）
  nextLive: MyAttendanceEntry | null;
  // 次以降（upcomingの2件目以降）。日付昇順
  laterUpcoming: MyAttendanceEntry[];
  // 今年の過去分（<今日 かつ 今年）。日付降順
  thisYearPast: MyAttendanceEntry[];
  // 日程未定
  undated: MyAttendanceEntry[];
};

// トップページのカレンダー（app/(authenticated)/page.tsx）と同じ
// getTodayInAppTimeZone（Asia/Tokyo基準）で「今日」を求め、performance_date
// （DATE列＝"YYYY-MM-DD"文字列）と文字列比較する。
function getTodayDateStr(): string {
  const today = getTodayInAppTimeZone();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 自分の参加記録全件を取得し、マイページ（#263）表示用に
 * サマリー + 次のライブ（1件）+ 次以降 + 今年の過去分 + 日程未定へ再構成する。
 */
export async function getMyAttendanceHistory(
  repo: AttendanceRepository
): Promise<MyAttendanceOverview> {
  const entries = await repo.findAllForUser();
  const todayStr = getTodayDateStr();
  const currentYear = getTodayInAppTimeZone().getFullYear();

  const upcoming: MyAttendanceEntry[] = [];
  const past: MyAttendanceEntry[] = [];
  const undated: MyAttendanceEntry[] = [];

  for (const entry of entries) {
    if (!entry.performanceDate) {
      undated.push(entry);
    } else if (entry.performanceDate >= todayStr) {
      upcoming.push(entry);
    } else {
      past.push(entry);
    }
  }

  // repository（findAllForUser）は降順（新しい順）で返すため、past はそのままでよく、
  // upcoming のみ昇順（近い順）に並び替える。
  upcoming.sort((a, b) =>
    (a.performanceDate ?? "").localeCompare(b.performanceDate ?? "")
  );

  const nextLive = upcoming[0] ?? null;
  const laterUpcoming = upcoming.slice(1);

  // past は performanceDate が必ず非null（undated は別枠）。日付降順は
  // repository のソート順を維持したまま、今年分のみを残す。
  const thisYearPast = past.filter(
    (entry) => entry.performanceDate!.slice(0, 4) === String(currentYear)
  );

  const thisYearCount = entries.filter(
    (entry) => entry.performanceDate && entry.performanceDate.slice(0, 4) === String(currentYear)
  ).length;

  return {
    summary: {
      upcomingCount: upcoming.length,
      thisYearCount,
      totalCount: entries.length,
    },
    nextLive,
    laterUpcoming,
    thisYearPast,
    undated,
  };
}
