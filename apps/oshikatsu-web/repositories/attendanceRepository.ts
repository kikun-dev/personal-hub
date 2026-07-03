import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { AttendanceRepository } from "@/types/repositories";
import type { LiveAttendance, MyAttendanceEntry } from "@/types/attendance";
import { isAttendedType } from "@/types/attendance";
import { isLiveType } from "@/types/live";
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

// マイページ（#247）の一覧用。参加記録 + 公演 + ライブ + 会場を1クエリで取得する。
// performance_id / live_id は NOT NULL FK のため生成型上は埋め込みが非null単一オブジェクト
// になる（liveRepository の orbit_groups 埋め込みと同様）。venue_id のみ nullable FK。
const MY_ATTENDANCE_SELECT = `
  id,
  attended_type,
  seat_note,
  note,
  orbit_live_performances(
    id,
    performance_date,
    starts_at,
    orbit_lives(id, name, live_type),
    orbit_venues(name, prefecture)
  )
` as const;

type MyAttendanceRow = SelectRows<
  "orbit_live_attendances",
  typeof MY_ATTENDANCE_SELECT
>[number];

function mapMyAttendanceEntry(row: MyAttendanceRow): MyAttendanceEntry {
  const performance = row.orbit_live_performances;
  const live = performance.orbit_lives;
  const venue = performance.orbit_venues;
  return {
    id: row.id,
    attendedType: isAttendedType(row.attended_type) ? row.attended_type : "onsite",
    seatNote: row.seat_note,
    note: row.note,
    performanceId: performance.id,
    performanceDate: performance.performance_date,
    startsAt: performance.starts_at,
    liveId: live.id,
    liveName: live.name,
    // live_type は DB 上 string 列（CHECK 制約で許容値を保証）。attendedType 同様、
    // 実行時ガードで想定外値のみ安全側 "other" にフォールバックする。
    liveType: isLiveType(live.live_type) ? live.live_type : "other",
    venueName: venue?.name ?? null,
    venuePrefecture: venue?.prefecture ?? null,
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

    async findAllForUser() {
      const { data, error } = await supabase
        .from("orbit_live_attendances")
        .select(MY_ATTENDANCE_SELECT);

      if (error) {
        throw new RepositoryError("参加記録一覧の取得に失敗しました", error);
      }

      // PostgREST は埋め込みリレーション（orbit_live_performances）の列で
      // トップレベルの行を直接ソートできないため、取得後にJS側でソートする
      // （LiveBrowser.tsx の firstDate ソートと同じ「null=末尾」の並び方）。
      // performance_date 降順・null は末尾。upcoming/past/undated への分割は
      // getMyAttendanceHistory ユースケース側で行う。
      return data.map(mapMyAttendanceEntry).sort((a, b) => {
        if (!a.performanceDate && !b.performanceDate) return 0;
        if (!a.performanceDate) return 1;
        if (!b.performanceDate) return -1;
        return b.performanceDate.localeCompare(a.performanceDate);
      });
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
