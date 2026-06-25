import type { SupabaseClient } from "@personal-hub/supabase";
import type { LiveRepository } from "@/types/repositories";
import type {
  CreateLiveInput,
  Live,
  LiveListItem,
  LiveOption,
  LivePerformance,
  LiveType,
  VenuePerformanceSummary,
} from "@/types/live";
import { RepositoryError } from "@/types/errors";

type GroupRel = { name_ja: string; color: string } | { name_ja: string; color: string }[] | null;
type MemberRel = { name_ja: string } | { name_ja: string }[] | null;
type VenueRel = { name: string } | { name: string }[] | null;

type PerformerGroupRow = {
  group_id: string;
  orbit_groups: GroupRel;
};

type PerformerMemberRow = {
  member_id: string;
  orbit_members: MemberRel;
};

type AbsenceRow = {
  member_id: string;
  note: string | null;
  orbit_members: MemberRel;
};

type PerformanceRow = {
  id: string;
  venue_id: string | null;
  performance_date: string | null;
  doors_open_at: string | null;
  starts_at: string | null;
  session_label: string | null;
  has_streaming: boolean;
  has_live_viewing: boolean;
  ticket_info: string | null;
  seat_info: string | null;
  sort_order: number;
  orbit_venues: VenueRel;
  orbit_live_performance_absences: AbsenceRow[] | null;
};

type LiveRow = {
  id: string;
  name: string;
  live_type: LiveType;
  description: string | null;
  orbit_live_performer_groups: PerformerGroupRow[] | null;
  orbit_live_performer_members: PerformerMemberRow[] | null;
  orbit_live_performances: PerformanceRow[] | null;
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.length > 0 ? value[0] : null;
  return value;
}

const DETAIL_SELECT = `
  id,
  name,
  live_type,
  description,
  orbit_live_performer_groups(group_id, orbit_groups(name_ja, color)),
  orbit_live_performer_members(member_id, orbit_members(name_ja)),
  orbit_live_performances(
    id,
    venue_id,
    performance_date,
    doors_open_at,
    starts_at,
    session_label,
    has_streaming,
    has_live_viewing,
    ticket_info,
    seat_info,
    sort_order,
    orbit_venues(name),
    orbit_live_performance_absences(member_id, note, orbit_members(name_ja))
  )
`;

function mapPerformance(row: PerformanceRow): LivePerformance {
  const venue = pickFirst(row.orbit_venues);
  return {
    id: row.id,
    venueId: row.venue_id,
    venueName: venue?.name ?? null,
    performanceDate: row.performance_date,
    doorsOpenAt: row.doors_open_at,
    startsAt: row.starts_at,
    sessionLabel: row.session_label,
    hasStreaming: row.has_streaming,
    hasLiveViewing: row.has_live_viewing,
    ticketInfo: row.ticket_info,
    seatInfo: row.seat_info,
    sortOrder: row.sort_order,
    absences: (row.orbit_live_performance_absences ?? []).map((absence) => ({
      memberId: absence.member_id,
      memberNameJa: pickFirst(absence.orbit_members)?.name_ja ?? "",
      note: absence.note,
    })),
  };
}

function mapLive(row: LiveRow): Live {
  return {
    id: row.id,
    name: row.name,
    liveType: row.live_type,
    description: row.description,
    performerGroups: (row.orbit_live_performer_groups ?? []).map((pg) => {
      const group = pickFirst(pg.orbit_groups);
      return {
        groupId: pg.group_id,
        groupNameJa: group?.name_ja ?? "",
        groupColor: group?.color ?? "#6B7280",
      };
    }),
    performerMembers: (row.orbit_live_performer_members ?? []).map((pm) => ({
      memberId: pm.member_id,
      memberNameJa: pickFirst(pm.orbit_members)?.name_ja ?? "",
    })),
    performances: (row.orbit_live_performances ?? [])
      .map(mapPerformance)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return (a.performanceDate ?? "").localeCompare(b.performanceDate ?? "");
      }),
  };
}

export function createLiveRepository(supabase: SupabaseClient): LiveRepository {
  async function replaceChildren(liveId: string, input: CreateLiveInput): Promise<void> {
    // 出演グループ
    if (input.performerGroupIds.length > 0) {
      const { error } = await supabase.from("orbit_live_performer_groups").insert(
        input.performerGroupIds.map((groupId) => ({ live_id: liveId, group_id: groupId }))
      );
      if (error) throw new RepositoryError("出演グループの登録に失敗しました", error);
    }

    // 出演メンバー
    if (input.performerMemberIds.length > 0) {
      const { error } = await supabase.from("orbit_live_performer_members").insert(
        input.performerMemberIds.map((memberId) => ({ live_id: liveId, member_id: memberId }))
      );
      if (error) throw new RepositoryError("出演メンバーの登録に失敗しました", error);
    }

    // 公演（＋休演）
    for (const [index, performance] of input.performances.entries()) {
      const { data, error } = await supabase
        .from("orbit_live_performances")
        .insert({
          live_id: liveId,
          venue_id: performance.venueId || null,
          performance_date: performance.performanceDate || null,
          doors_open_at: performance.doorsOpenAt.trim() || null,
          starts_at: performance.startsAt.trim() || null,
          session_label: performance.sessionLabel.trim() || null,
          has_streaming: performance.hasStreaming,
          has_live_viewing: performance.hasLiveViewing,
          ticket_info: performance.ticketInfo.trim() || null,
          seat_info: performance.seatInfo.trim() || null,
          sort_order: index,
        })
        .select("id")
        .single();

      if (error) throw new RepositoryError("公演の登録に失敗しました", error);

      const performanceId = (data as { id: string }).id;
      const absences = performance.absences.filter((absence) => absence.memberId);
      if (absences.length > 0) {
        const { error: absenceError } = await supabase
          .from("orbit_live_performance_absences")
          .insert(
            absences.map((absence) => ({
              performance_id: performanceId,
              member_id: absence.memberId,
              note: absence.note.trim() || null,
            }))
          );
        if (absenceError) {
          throw new RepositoryError("休演メンバーの登録に失敗しました", absenceError);
        }
      }
    }
  }

  async function clearChildren(liveId: string): Promise<void> {
    // 公演削除（休演は ON DELETE CASCADE）
    const tables = [
      "orbit_live_performances",
      "orbit_live_performer_groups",
      "orbit_live_performer_members",
    ] as const;
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("live_id", liveId);
      if (error) throw new RepositoryError("ライブ関連データの更新に失敗しました", error);
    }
  }

  return {
    async findPublicList() {
      const { data, error } = await supabase
        .from("orbit_lives")
        .select(`
          id,
          name,
          live_type,
          orbit_live_performer_groups(orbit_groups(name_ja)),
          orbit_live_performances(performance_date)
        `)
        .order("name");

      if (error) {
        throw new RepositoryError("ライブ一覧の取得に失敗しました", error);
      }

      type ListRow = {
        id: string;
        name: string;
        live_type: LiveType;
        orbit_live_performer_groups: { orbit_groups: MemberRel | GroupRel }[] | null;
        orbit_live_performances: { performance_date: string | null }[] | null;
      };

      return ((data as unknown as ListRow[]) ?? []).map((row): LiveListItem => {
        const dates = (row.orbit_live_performances ?? [])
          .map((p) => p.performance_date)
          .filter((d): d is string => Boolean(d))
          .sort((a, b) => a.localeCompare(b));
        return {
          id: row.id,
          name: row.name,
          liveType: row.live_type,
          performerGroupNames: (row.orbit_live_performer_groups ?? [])
            .map((pg) => pickFirst(pg.orbit_groups as GroupRel)?.name_ja ?? "")
            .filter(Boolean),
          firstDate: dates[0] ?? null,
          lastDate: dates.length > 0 ? dates[dates.length - 1] : null,
          performanceCount: row.orbit_live_performances?.length ?? 0,
        };
      });
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_lives")
        .select("id, name")
        .order("name");

      if (error) {
        throw new RepositoryError("ライブ候補の取得に失敗しました", error);
      }

      return ((data as { id: string; name: string }[] | null) ?? []).map(
        (row): LiveOption => ({ id: row.id, name: row.name })
      );
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

      return mapLive(data as unknown as LiveRow);
    },

    async findPerformancesByVenue(venueId) {
      const { data, error } = await supabase
        .from("orbit_live_performances")
        .select(`
          id,
          performance_date,
          session_label,
          live_id,
          orbit_lives(name)
        `)
        .eq("venue_id", venueId)
        .order("performance_date", { ascending: false, nullsFirst: false });

      if (error) {
        throw new RepositoryError("会場の公演一覧の取得に失敗しました", error);
      }

      type Row = {
        id: string;
        performance_date: string | null;
        session_label: string | null;
        live_id: string;
        orbit_lives: { name: string } | { name: string }[] | null;
      };

      return ((data as unknown as Row[]) ?? []).map(
        (row): VenuePerformanceSummary => ({
          performanceId: row.id,
          liveId: row.live_id,
          liveName: pickFirst(row.orbit_lives)?.name ?? "",
          performanceDate: row.performance_date,
          sessionLabel: row.session_label,
        })
      );
    },

    async create(input) {
      const { data, error } = await supabase
        .from("orbit_lives")
        .insert({
          name: input.name.trim(),
          live_type: input.liveType,
          description: input.description.trim() || null,
        })
        .select("id")
        .single();

      if (error) {
        throw new RepositoryError("ライブの作成に失敗しました", error);
      }

      const liveId = (data as { id: string }).id;
      await replaceChildren(liveId, input);

      const created = await this.findById(liveId);
      if (!created) {
        throw new RepositoryError("作成したライブの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError("更新対象のライブが見つかりません", null);
      }

      const { error } = await supabase
        .from("orbit_lives")
        .update({
          name: input.name.trim(),
          live_type: input.liveType,
          description: input.description.trim() || null,
        })
        .eq("id", id);

      if (error) {
        throw new RepositoryError("ライブの更新に失敗しました", error);
      }

      await clearChildren(id);
      await replaceChildren(id, input);

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新したライブの取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const { error } = await supabase.from("orbit_lives").delete().eq("id", id);
      if (error) {
        throw new RepositoryError("ライブの削除に失敗しました", error);
      }
    },
  };
}
