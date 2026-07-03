import type { AttendanceRepository } from "@/types/repositories";
import type { MyAttendanceEntry } from "@/types/attendance";
import { getTodayInAppTimeZone } from "@/lib/dateParams";

export type MyAttendanceHistory = {
  // 次のライブ。当日公演を含む（当日は「次のライブ」として見えるべきのため）。日付昇順。
  upcoming: MyAttendanceEntry[];
  // 過去の参加記録。日付降順（新しい順）。
  past: MyAttendanceEntry[];
  // 日程未定（公演の performance_date が未設定）の参加記録。
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
 * 自分の参加記録全件を取得し、マイページ（#247）表示用に
 * upcoming（当日含む未来） / past（過去） / undated（日程未定）へ分割する。
 */
export async function getMyAttendanceHistory(
  repo: AttendanceRepository
): Promise<MyAttendanceHistory> {
  const entries = await repo.findAllForUser();
  const todayStr = getTodayDateStr();

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

  return { upcoming, past, undated };
}
