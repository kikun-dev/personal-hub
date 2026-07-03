import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { AttendanceRepository } from "@/types/repositories";
import type { LiveAttendance, MyAttendanceEntry, SongEncounter } from "@/types/attendance";
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

// マイページ（#247）の一覧 + 参加記録の集計（#248）+ 会場訪問の集計（#250）用。
// 参加記録 + 公演 + ライブ + 会場 + 出演グループを1クエリで取得する。
// performance_id / live_id は NOT NULL FK のため生成型上は埋め込みが非null単一
// オブジェクトになる（liveRepository の orbit_groups 埋め込みと同様）。venue_id
// のみ nullable FK。orbit_live_performer_groups はライブに対する多対多
// （対バン・フェスは複数件）のため配列になる。venues の id は会場訪問集計
// （getVenueVisitStats）で会場ごとにグルーピングするためのキーとして使う。
const MY_ATTENDANCE_SELECT = `
  id,
  attended_type,
  seat_note,
  note,
  orbit_live_performances(
    id,
    performance_date,
    starts_at,
    orbit_lives(
      id,
      name,
      live_type,
      orbit_live_performer_groups(orbit_groups(id, name_ja, color))
    ),
    orbit_venues(id, name, prefecture)
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
    venueId: venue?.id ?? null,
    venueName: venue?.name ?? null,
    venuePrefecture: venue?.prefecture ?? null,
    groups: live.orbit_live_performer_groups.map((pg) => ({
      id: pg.orbit_groups.id,
      nameJa: pg.orbit_groups.name_ja,
      color: pg.orbit_groups.color,
    })),
  };
}

// セットリストカウント（#249）用。参加記録 + 公演 + ライブ + セトリを1クエリで取得する
// （Issue #249 最新コメントの決定：専用 RPC ではなくネスト select + アプリ側集計）。
// performance_id は NOT NULL FK のため埋め込みは非null単一オブジェクト（MY_ATTENDANCE_SELECT
// と同様）。orbit_setlist_items は公演に対する1対多のため配列になる。
const SONG_ENCOUNTER_SELECT = `
  attended_type,
  orbit_live_performances(
    id,
    performance_date,
    orbit_lives(id, name),
    orbit_setlist_items(item_type, track_id)
  )
` as const;

type SongEncounterRow = SelectRows<
  "orbit_live_attendances",
  typeof SONG_ENCOUNTER_SELECT
>[number];

// 1参加記録（1公演）から、セトリの登録曲（item_type='song' かつ track_id 非null）
// の分だけ SongEncounter を展開する。未登録曲（テキスト曲）は Non-goals のため除外する。
// 1公演で同じ曲を複数回披露していれば、その回数分このリストに複数件並ぶ。
function mapSongEncounters(row: SongEncounterRow): SongEncounter[] {
  const performance = row.orbit_live_performances;
  const live = performance.orbit_lives;
  const attendedType = isAttendedType(row.attended_type) ? row.attended_type : "onsite";

  const encounters: SongEncounter[] = [];
  for (const item of performance.orbit_setlist_items) {
    if (item.item_type !== "song" || item.track_id === null) {
      continue;
    }
    encounters.push({
      trackId: item.track_id,
      attendedType,
      performanceId: performance.id,
      performanceDate: performance.performance_date,
      liveId: live.id,
      liveName: live.name,
    });
  }
  return encounters;
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
        throw new RepositoryError("参戦記録の取得に失敗しました", error);
      }

      return data.map(mapAttendance);
    },

    async findAllForUser() {
      const { data, error } = await supabase
        .from("orbit_live_attendances")
        .select(MY_ATTENDANCE_SELECT);

      if (error) {
        throw new RepositoryError("参戦記録一覧の取得に失敗しました", error);
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

    async findSongEncounters() {
      const { data, error } = await supabase
        .from("orbit_live_attendances")
        .select(SONG_ENCOUNTER_SELECT);

      if (error) {
        throw new RepositoryError("遭遇記録の取得に失敗しました", error);
      }

      return data.flatMap(mapSongEncounters);
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
        throw new RepositoryError("参戦記録の保存に失敗しました", error);
      }
    },

    async delete(performanceId) {
      const { error } = await supabase
        .from("orbit_live_attendances")
        .delete()
        .eq("performance_id", performanceId);

      if (error) {
        throw new RepositoryError("参戦記録の解除に失敗しました", error);
      }
    },
  };
}
