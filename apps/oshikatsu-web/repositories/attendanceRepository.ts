import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { AttendanceRepository } from "@/types/repositories";
import type { LiveAttendance } from "@/types/attendance";
import { isAttendedType } from "@/types/attendance";
import { RepositoryError } from "@/types/errors";

/**
 * 参加記録（orbit_live_attendances）はOrbit初のユーザー別データ（ADR 0009）。
 * グローバルデータのリポジトリ（liveRepository 等）は shared read cache 用に
 * OrbitReadClient（read path）と asWritableClient（write path、service role
 * バイパスを防ぐための型分離）を組み合わせるが、ユーザー別データは
 * shared cache の対象外（ADR 0009）。そのため read/write を分けず、常に認証付きの
 * TypedSupabaseClient をそのまま受け取り、RLS（migration 047: 本人限定 +
 * ロール判定）に委ねて読み書きする。
 */

const ATTENDANCE_SELECT = `
  id,
  performance_id,
  attended_type,
  seat_note,
  note
` as const;

type AttendanceRow = SelectRows<
  "orbit_live_attendances",
  typeof ATTENDANCE_SELECT
>[number];

function mapAttendance(row: AttendanceRow): LiveAttendance {
  return {
    id: row.id,
    performanceId: row.performance_id,
    // attended_type は DB 上 string 列（CHECK 制約で許容値を保証）。LiveAttendance は
    // AttendedType（null不可）のドメイン型のため、実行時ガードで想定外値のみ
    // 安全側 "onsite" にフォールバックする（liveRepository の live_type 同様、
    // CHECK 制約があるため通常は発生しない想定）。
    attendedType: isAttendedType(row.attended_type) ? row.attended_type : "onsite",
    seatNote: row.seat_note,
    note: row.note,
  };
}

export function createAttendanceRepository(
  supabase: TypedSupabaseClient
): AttendanceRepository {
  return {
    async findByPerformanceIds(performanceIds) {
      if (performanceIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("orbit_live_attendances")
        .select(ATTENDANCE_SELECT)
        .in("performance_id", performanceIds);

      if (error) {
        throw new RepositoryError("参加記録の取得に失敗しました", error);
      }

      return data.map(mapAttendance);
    },

    async upsert(userId, input) {
      const { error } = await supabase.from("orbit_live_attendances").upsert(
        {
          user_id: userId,
          performance_id: input.performanceId,
          attended_type: input.attendedType,
          seat_note: input.seatNote.trim() || null,
          note: input.note.trim() || null,
        },
        { onConflict: "user_id,performance_id" }
      );

      if (error) {
        throw new RepositoryError("参加記録の保存に失敗しました", error);
      }
    },

    async delete(performanceId) {
      const { error } = await supabase
        .from("orbit_live_attendances")
        .delete()
        .eq("performance_id", performanceId);

      if (error) {
        throw new RepositoryError("参加記録の解除に失敗しました", error);
      }
    },
  };
}
