import type { AttendanceRepository } from "@/types/repositories";
import type { LiveAttendance } from "@/types/attendance";

/**
 * 公演ID群から自分の参加記録（RLSにより本人分のみ）を取得し、
 * 公演IDをキーにしたMapへ変換する。ライブ詳細ページで公演カードごとに
 * 自分の参加記録を合成する用途で使う。
 */
export async function getMyAttendancesForLive(
  repo: AttendanceRepository,
  performanceIds: string[]
): Promise<Map<string, LiveAttendance>> {
  const attendances = await repo.findByPerformanceIds(performanceIds);
  return new Map(
    attendances.map((attendance) => [attendance.performanceId, attendance])
  );
}
