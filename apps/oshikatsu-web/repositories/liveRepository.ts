import type { SupabaseClient } from "@personal-hub/supabase";
import type { LiveRepository } from "@/types/repositories";
import type {
  CreateLiveInput,
  Live,
  LiveListItem,
  LiveOption,
  LivePerformance,
  LiveType,
  SetlistItem,
  VenuePerformanceSummary,
} from "@/types/live";
import { isSetlistItemType, isPerformanceStyle } from "@/types/live";
import { RepositoryError } from "@/types/errors";

type GroupRel = { name_ja: string; color: string } | { name_ja: string; color: string }[] | null;
type MemberRel = { name_ja: string } | { name_ja: string }[] | null;
type VenueRel =
  | { name: string; prefecture: string | null }
  | { name: string; prefecture: string | null }[]
  | null;

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

type TrackRel = { title: string } | { title: string }[] | null;

type SetlistItemMemberRow = {
  member_id: string;
  is_center: boolean;
  sort_order: number;
  orbit_members: MemberRel;
};

type SetlistItemRow = {
  position: number;
  item_type: string;
  track_id: string | null;
  song_title: string | null;
  note: string | null;
  performance_style: string | null;
  orbit_tracks: TrackRel;
  orbit_setlist_item_members: SetlistItemMemberRow[] | null;
};

type PerformanceRow = {
  id: string;
  venue_id: string | null;
  performance_date: string | null;
  doors_open_at: string | null;
  starts_at: string | null;
  has_streaming: boolean;
  has_live_viewing: boolean;
  ticket_info: string | null;
  seat_info: string | null;
  sort_order: number;
  orbit_venues: VenueRel;
  orbit_live_performance_absences: AbsenceRow[] | null;
  orbit_setlist_items: SetlistItemRow[] | null;
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
`;

function mapPerformance(row: PerformanceRow): LivePerformance {
  const venue = pickFirst(row.orbit_venues);
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
    absences: (row.orbit_live_performance_absences ?? []).map((absence) => ({
      memberId: absence.member_id,
      memberNameJa: pickFirst(absence.orbit_members)?.name_ja ?? "",
      note: absence.note,
    })),
    setlistItems: (row.orbit_setlist_items ?? [])
      .map((item): SetlistItem => ({
        itemType: isSetlistItemType(item.item_type) ? item.item_type : "other",
        trackId: item.track_id,
        trackTitle: pickFirst(item.orbit_tracks)?.title ?? null,
        songTitle: item.song_title,
        note: item.note,
        performanceStyle:
          item.performance_style && isPerformanceStyle(item.performance_style)
            ? item.performance_style
            : null,
        members: (item.orbit_setlist_item_members ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((member) => ({
            memberId: member.member_id,
            memberNameJa: pickFirst(member.orbit_members)?.name_ja ?? "",
            isCenter: member.is_center,
          })),
        position: item.position,
      }))
      .sort((a, b) => a.position - b.position),
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

function toLivePayload(input: CreateLiveInput) {
  return {
    name: input.name.trim(),
    live_type: input.liveType,
    description: input.description.trim(),
    performer_group_ids: input.performerGroupIds,
    performer_member_ids: input.performerMemberIds,
    performances: input.performances.map((performance) => ({
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

export function createLiveRepository(supabase: SupabaseClient): LiveRepository {
  return {
    async findPublicList() {
      const { data, error } = await supabase
        .from("orbit_lives")
        .select(`
          id,
          name,
          live_type,
          orbit_live_performer_groups(group_id, orbit_groups(name_ja, color)),
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
        orbit_live_performer_groups: PerformerGroupRow[] | null;
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
          performerGroups: (row.orbit_live_performer_groups ?? []).map((pg) => {
            const group = pickFirst(pg.orbit_groups);
            return {
              groupId: pg.group_id,
              groupNameJa: group?.name_ja ?? "",
              groupColor: group?.color ?? "#6B7280",
            };
          }),
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
        live_id: string;
        orbit_lives: { name: string } | { name: string }[] | null;
      };

      return ((data as unknown as Row[]) ?? []).map(
        (row): VenuePerformanceSummary => ({
          performanceId: row.id,
          liveId: row.live_id,
          liveName: pickFirst(row.orbit_lives)?.name ?? "",
          performanceDate: row.performance_date,
        })
      );
    },

    async create(input) {
      const { data, error } = await supabase.rpc("upsert_orbit_live", {
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
      const { data, error } = await supabase.rpc("upsert_orbit_live", {
        p_id: id,
        p_payload: toLivePayload(input),
      });

      if (error) {
        throw new RepositoryError("ライブの更新に失敗しました", error);
      }

      const updated = await this.findById(data as string);
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
