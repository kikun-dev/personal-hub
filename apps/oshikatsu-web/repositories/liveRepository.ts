import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { LiveRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { asWritableClient } from "@/lib/asWritableClient";
import type {
  CreateLiveInput,
  Live,
  LiveListItem,
  LiveOption,
  LiveType,
} from "@/types/live";
import { isSetlistItemType, isPerformanceStyle } from "@/types/live";
import { RepositoryError } from "@/types/errors";
import {
  compareByGenerationThenName,
  pickMembershipGeneration,
} from "@/lib/memberOrder";

const DETAIL_SELECT = `
  id,
  name,
  live_type,
  description,
  orbit_live_performer_groups(group_id, orbit_groups(name_ja, color)),
  orbit_live_performer_members(member_id, orbit_members(name_ja, name_kana, orbit_member_groups(group_id, generation))),
  orbit_live_performances(
    id,
    venue_id,
    performance_date,
    doors_open_at,
    starts_at,
    has_streaming,
    has_live_viewing,
    ticket_info,
    seat_info,
    sort_order,
    orbit_venues(name, prefecture),
    orbit_live_performance_absences(member_id, note, orbit_members(name_ja)),
    orbit_setlist_items(
      position,
      item_type,
      track_id,
      song_title,
      note,
      performance_style,
      orbit_tracks(title),
      orbit_setlist_item_members(member_id, is_center, sort_order, orbit_members(name_ja))
    )
  )
` as const;

const PUBLIC_LIST_SELECT = `
  id,
  name,
  live_type,
  orbit_live_performer_groups(group_id, orbit_groups(name_ja, color)),
  orbit_live_performances(performance_date)
` as const;

const CALENDAR_PERFORMANCE_SELECT =
  "performance_date, live_id, orbit_lives(name)" as const;

const LIVE_OPTION_SELECT = "id, name" as const;

const VENUE_PERFORMANCE_SELECT = `
  id,
  performance_date,
  live_id,
  orbit_lives(name)
` as const;

type LiveRow = SelectRows<"orbit_lives", typeof DETAIL_SELECT>[number];
type PerformanceRow = LiveRow["orbit_live_performances"][number];

function mapPerformance(row: PerformanceRow): Live["performances"][number] {
  const venue = row.orbit_venues;
  return {
    id: row.id,
    venueId: row.venue_id,
    venueName: venue?.name ?? null,
    venuePrefecture: venue?.prefecture ?? null,
    performanceDate: row.performance_date,
    doorsOpenAt: row.doors_open_at,
    startsAt: row.starts_at,
    hasStreaming: row.has_streaming,
    hasLiveViewing: row.has_live_viewing,
    ticketInfo: row.ticket_info,
    seatInfo: row.seat_info,
    sortOrder: row.sort_order,
    absences: row.orbit_live_performance_absences.map((absence) => ({
      memberId: absence.member_id,
      memberNameJa: absence.orbit_members.name_ja,
      note: absence.note,
    })),
    setlistItems: row.orbit_setlist_items
      .map((item) => ({
        itemType: isSetlistItemType(item.item_type) ? item.item_type : "other",
        trackId: item.track_id,
        trackTitle: item.orbit_tracks?.title ?? null,
        songTitle: item.song_title,
        note: item.note,
        performanceStyle:
          item.performance_style && isPerformanceStyle(item.performance_style)
            ? item.performance_style
            : null,
        members: item.orbit_setlist_item_members
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((member) => ({
            memberId: member.member_id,
            memberNameJa: member.orbit_members.name_ja,
            isCenter: member.is_center,
          })),
        position: item.position,
      }))
      .sort((a, b) => a.position - b.position),
  };
}

function mapLive(row: LiveRow): Live {
  const performerGroupIds = new Set(
    row.orbit_live_performer_groups.map((pg) => pg.group_id)
  );
  return {
    id: row.id,
    name: row.name,
    // live_type は DB 上 string 列（CHECK 制約で許容値を保証）。LiveType は null を持たない
    // ドメイン型のため、実行時ガード（isLiveType）を導入するとフォールバック分岐が新たに
    // 必要になりロジックが変わってしまう。移行前も無条件 cast だったため、同じ挙動を保つ
    // cast として残す。
    liveType: row.live_type as LiveType,
    description: row.description,
    performerGroups: row.orbit_live_performer_groups.map((pg) => ({
      groupId: pg.group_id,
      groupNameJa: pg.orbit_groups.name_ja,
      groupColor: pg.orbit_groups.color,
    })),
    performerMembers: row.orbit_live_performer_members
      .map((pm) => {
        const member = pm.orbit_members;
        const memberships = member.orbit_member_groups ?? [];
        // 出演グループでの期を優先しつつ、DB返却順に依存せず決定的に選ぶ
        return {
          memberId: pm.member_id,
          memberNameJa: member.name_ja,
          memberNameKana: member.name_kana,
          generation: pickMembershipGeneration(memberships, performerGroupIds),
        };
      })
      .sort((a, b) =>
        compareByGenerationThenName(
          { generation: a.generation, nameKana: a.memberNameKana },
          { generation: b.generation, nameKana: b.memberNameKana }
        )
      )
      .map(({ memberId, memberNameJa, generation }) => ({
        memberId,
        memberNameJa,
        generation,
      })),
    performances: row.orbit_live_performances
      .map(mapPerformance)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return (a.performanceDate ?? "").localeCompare(b.performanceDate ?? "");
      }),
  };
}

function toLivePayload(input: CreateLiveInput) {
  return {
    name: input.name.trim(),
    live_type: input.liveType,
    description: input.description.trim(),
    performer_group_ids: input.performerGroupIds,
    performer_member_ids: input.performerMemberIds,
    performances: input.performances.map((performance) => ({
      // 048: 既存公演はidを維持してUPDATEするため送る。新規公演はnull（INSERT扱い）。
      id: performance.id || null,
      venue_id: performance.venueId || null,
      performance_date: performance.performanceDate || null,
      doors_open_at: performance.doorsOpenAt.trim(),
      starts_at: performance.startsAt.trim(),
      has_streaming: performance.hasStreaming,
      has_live_viewing: performance.hasLiveViewing,
      ticket_info: performance.ticketInfo.trim(),
      seat_info: performance.seatInfo.trim(),
      absences: performance.absences
        .filter((absence) => absence.memberId)
        .map((absence) => ({
          member_id: absence.memberId,
          note: absence.note.trim(),
        })),
      setlist_items: performance.setlistItems.map((item) => {
        const isSong = item.itemType === "song";
        return {
          item_type: item.itemType,
          track_id: isSong ? item.trackId : "",
          song_title: isSong ? item.songTitle.trim() : "",
          note: item.note.trim(),
          performance_style: isSong ? item.performanceStyle : "",
          members: isSong
            ? item.members
                .filter((member) => member.memberId)
                .map((member) => ({
                  member_id: member.memberId,
                  is_center: member.isCenter,
                }))
            : [],
        };
      }),
    })),
  };
}

export function createLiveRepository(supabase: OrbitReadClient): LiveRepository {
  return {
    async findPublicList() {
      const { data, error } = await supabase
        .from("orbit_lives")
        .select(PUBLIC_LIST_SELECT)
        .order("name");

      if (error) {
        throw new RepositoryError("ライブ一覧の取得に失敗しました", error);
      }

      return data.map((row): LiveListItem => {
        const dates = row.orbit_live_performances
          .map((p) => p.performance_date)
          .filter((d): d is string => Boolean(d))
          .sort((a, b) => a.localeCompare(b));
        return {
          id: row.id,
          name: row.name,
          // live_type は DB 上 string 列。理由は mapLive の comment を参照。
          liveType: row.live_type as LiveType,
          performerGroups: row.orbit_live_performer_groups.map((pg) => ({
            groupId: pg.group_id,
            groupNameJa: pg.orbit_groups.name_ja,
            groupColor: pg.orbit_groups.color,
          })),
          firstDate: dates[0] ?? null,
          lastDate: dates.length > 0 ? dates[dates.length - 1] : null,
          performanceCount: row.orbit_live_performances.length,
        };
      });
    },

    async findCalendarPerformances() {
      const { data, error } = await supabase
        .from("orbit_live_performances")
        .select(CALENDAR_PERFORMANCE_SELECT)
        .not("performance_date", "is", null);

      if (error) {
        throw new RepositoryError("カレンダー用ライブの取得に失敗しました", error);
      }

      return data.map((row) => ({
        liveId: row.live_id,
        liveName: row.orbit_lives.name,
        // performance_date は .not(..., "is", null) で非null行のみに絞っているが、生成型は
        // 列自体のnull許容をそのまま反映するため、クエリによる絞り込みを反映した cast として
        // 残す。
        date: row.performance_date as string,
      }));
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_lives")
        .select(LIVE_OPTION_SELECT)
        .order("name");

      if (error) {
        throw new RepositoryError("ライブ候補の取得に失敗しました", error);
      }

      return data.map((row): LiveOption => ({ id: row.id, name: row.name }));
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_lives")
        .select(DETAIL_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("ライブの取得に失敗しました", error);
      }

      return mapLive(data);
    },

    async findPerformancesByVenue(venueId) {
      const { data, error } = await supabase
        .from("orbit_live_performances")
        .select(VENUE_PERFORMANCE_SELECT)
        .eq("venue_id", venueId)
        .order("performance_date", { ascending: false, nullsFirst: false });

      if (error) {
        throw new RepositoryError("会場の公演一覧の取得に失敗しました", error);
      }

      return data.map((row) => ({
        performanceId: row.id,
        liveId: row.live_id,
        liveName: row.orbit_lives.name,
        performanceDate: row.performance_date,
      }));
    },

    async create(input) {
      // upsert_orbit_live の p_id は生成型上 non-null な string になっているが、create
      // では新規作成のため p_id: null を送る必要がある（関数は null を「新規作成」の合図
      // として受け付ける）。生成型がこのケースを表現できない既知の制約のため、
      // TypedSupabaseClient にせず asWritableClient の返り値（未typed）のまま呼び出す。
      const writable = asWritableClient(supabase);
      const { data, error } = await writable.rpc("upsert_orbit_live", {
        p_id: null,
        p_payload: toLivePayload(input),
      });

      if (error) {
        throw new RepositoryError("ライブの作成に失敗しました", error);
      }

      const created = await this.findById(data as string);
      if (!created) {
        throw new RepositoryError("作成したライブの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      // update では p_id に既存の非null文字列idを渡すため実ペイロードと生成型 Args が
      // 一致する。typed client で呼び出す。
      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { data, error } = await writable.rpc("upsert_orbit_live", {
        p_id: id,
        p_payload: toLivePayload(input),
      });

      if (error) {
        // 23503: FK RESTRICT違反。参加記録（orbit_live_attendances, 047）が紐づく
        // 公演をpayloadから外して削除しようとした場合に発生する（048で公演IDを維持する
        // 方式に変更済みだが、公演自体を削除する編集ではこの制約に当たり得る）。
        // ユーザーが対処できる文言に変換する。
        if (error.code === "23503") {
          throw new RepositoryError(
            "参加記録が登録されている公演は削除できません。該当公演の参加記録を解除してから編集してください",
            error
          );
        }
        throw new RepositoryError("ライブの更新に失敗しました", error);
      }

      const updated = await this.findById(data);
      if (!updated) {
        throw new RepositoryError("更新したライブの取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const writable = asWritableClient(supabase);
      const { error } = await writable.from("orbit_lives").delete().eq("id", id);
      if (error) {
        throw new RepositoryError("ライブの削除に失敗しました", error);
      }
    },
  };
}
