import type { Song, SongOption, CalendarVideoItem } from "@/types/song";
import { isSongVideoType } from "@/types/song";
import type { SongRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";
import type { SongRow, SongListRow } from "./songMapper";
import {
  mapSong,
  mapToSongListItem,
  parseLabel,
  parseGeneration,
  parseReleaseLinks,
  parseCredits,
  parseFormationRows,
  parseMv,
  parseVideos,
  parseCostumes,
} from "./songMapper";

const SONG_LIST_SELECT = `
  id,
  title,
  group_id,
  orbit_groups(name_ja, color),
  label,
  generation,
  orbit_release_tracks(
    release_id,
    track_number,
    orbit_releases(
      id,
      title,
      release_type,
      numbering,
      group_id,
      release_date,
      orbit_groups(name_ja, color)
    )
  )
`;

const SONG_DETAIL_SELECT = `
  id,
  title,
  group_id,
  orbit_groups(name_ja, color),
  label,
  generation,
  orbit_release_tracks(
    release_id,
    track_number,
    orbit_releases(
      id,
      title,
      release_type,
      numbering,
      group_id,
      release_date,
      orbit_groups(name_ja, color)
    )
  ),
  orbit_track_credits(
    credit_role,
    sort_order,
    orbit_people(display_name)
  ),
  orbit_track_formations(
    id,
    column_count,
    orbit_track_formation_rows(
      id,
      row_number,
      member_count,
      orbit_track_formation_members(
        member_id,
        slot_order,
        is_center,
        orbit_members(name_ja)
      )
    )
  ),
  orbit_track_mvs(
    mv_url,
    location,
    published_on,
    memo,
    orbit_people(display_name)
  ),
  orbit_track_videos(
    video_type,
    video_url,
    published_on,
    memo
  ),
  orbit_track_costumes(
    id,
    image_path,
    note,
    sort_order,
    orbit_people(display_name)
  )
`;

const SONG_PUBLIC_LIST_SELECT = `
  id,
  title,
  group_id,
  orbit_groups(name_ja, color),
  label,
  generation,
  orbit_release_tracks(
    release_id,
    track_number,
    orbit_releases(release_date, release_type, numbering)
  )
`;

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

// 曲順が空欄(null)の紐づけを、そのリリース内の末尾（max + 1）に解決する
// select のみを行う読み取り専用処理のため OrbitReadClient で受け取る
async function resolveReleaseLinkTrackNumbers(
  supabase: OrbitReadClient,
  links: Array<{ releaseId: string; trackNumber: number | null }>,
  excludeTrackId?: string
): Promise<Array<{ releaseId: string; trackNumber: number }>> {
  const resolved: Array<{ releaseId: string; trackNumber: number }> = [];
  for (const link of links) {
    if (link.trackNumber != null) {
      resolved.push({ releaseId: link.releaseId, trackNumber: link.trackNumber });
      continue;
    }
    let query = supabase
      .from("orbit_release_tracks")
      .select("track_number")
      .eq("release_id", link.releaseId)
      .order("track_number", { ascending: false })
      .limit(1);
    if (excludeTrackId) {
      query = query.neq("track_id", excludeTrackId);
    }
    const { data, error } = await query;
    if (error) {
      throw new RepositoryError("曲順の自動採番に失敗しました", error);
    }
    const maxNumber =
      data && data.length > 0 ? (data[0] as { track_number: number }).track_number : 0;
    resolved.push({ releaseId: link.releaseId, trackNumber: maxNumber + 1 });
  }
  return resolved;
}

export function createSongRepository(
  supabase: OrbitReadClient
): SongRepository {
  async function findManyByIds(ids: string[], select: string): Promise<Song[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("orbit_tracks")
      .select(select)
      .in("id", ids)
      .order("title");

    if (error) {
      throw new RepositoryError("楽曲情報の取得に失敗しました", error);
    }

    return (data as unknown as SongRow[]).map(mapSong);
  }

  // フォーメーション列(formation_row)の集合から、所属する楽曲(track)IDを解決する
  async function resolveTrackIdsFromRowIds(rowIds: string[]): Promise<string[]> {
    if (rowIds.length === 0) return [];

    const { data: formationRows, error: formationRowsError } = await supabase
      .from("orbit_track_formation_rows")
      .select("formation_id")
      .in("id", rowIds);

    if (formationRowsError) {
      throw new RepositoryError("参加楽曲の取得に失敗しました", formationRowsError);
    }

    const formationIds = uniqueStrings(
      ((formationRows as Array<{ formation_id: string }>) ?? []).map(
        (row) => row.formation_id
      )
    );

    if (formationIds.length === 0) return [];

    const { data: formations, error: formationsError } = await supabase
      .from("orbit_track_formations")
      .select("track_id")
      .in("id", formationIds);

    if (formationsError) {
      throw new RepositoryError("参加楽曲の取得に失敗しました", formationsError);
    }

    return uniqueStrings(
      ((formations as Array<{ track_id: string }>) ?? []).map((row) => row.track_id)
    );
  }

  return {
    async findAll(filters) {
      let query = supabase
        .from("orbit_tracks")
        .select(SONG_LIST_SELECT)
        .order("title");

      if (filters?.groupId) {
        query = query.eq("group_id", filters.groupId);
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError("楽曲一覧の取得に失敗しました", error);
      }

      return (data as unknown as SongRow[]).map(mapSong);
    },

    async findPublicList(filters) {
      let query = supabase
        .from("orbit_tracks")
        .select(SONG_PUBLIC_LIST_SELECT)
        .order("title");

      if (filters?.groupId) {
        query = query.eq("group_id", filters.groupId);
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError("公開向け楽曲一覧の取得に失敗しました", error);
      }

      return (data as unknown as SongListRow[]).map(mapToSongListItem);
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_tracks")
        .select("id, title")
        .order("title");

      if (error) {
        throw new RepositoryError("楽曲候補の取得に失敗しました", error);
      }

      return ((data as Array<{ id: string; title: string }>) ?? []).map((row) => ({
        id: row.id,
        title: row.title,
      })) satisfies SongOption[];
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_tracks")
        .select(SONG_DETAIL_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("楽曲の取得に失敗しました", error);
      }

      return mapSong(data as unknown as SongRow);
    },

    async create(input) {
      const label = parseLabel(input.label);
      const generation = parseGeneration(input.label, input.generation);
      const releaseLinks = await resolveReleaseLinkTrackNumbers(
        supabase,
        parseReleaseLinks(input.releaseLinks)
      );
      const credits = parseCredits(input);
      const formationRows = parseFormationRows(input.formationRows);
      const mv = parseMv(input.mv);
      const videos = parseVideos(input.videos);
      const costumes = parseCostumes(input.costumes);

      const writable = asWritableClient(supabase);
      const { data: trackId, error: rpcError } = await writable.rpc("create_track_with_relations_v2", {
        p_title: input.title.trim(),
        p_group_id: input.groupId,
        p_label: label,
        p_generation: generation,
        p_release_links: releaseLinks,
        p_credits: credits,
        p_formation_rows: formationRows,
        p_mv: mv,
        p_videos: videos,
        p_costumes: costumes,
      });

      if (rpcError) {
        throw new RepositoryError("楽曲の作成に失敗しました", rpcError);
      }

      if (typeof trackId !== "string") {
        throw new RepositoryError("作成した楽曲IDの取得に失敗しました", null);
      }

      const { error: centerError } = await writable.rpc("set_track_centers", {
        p_track_id: trackId,
        p_center_member_ids: input.centerMemberIds,
      });
      if (centerError) {
        throw new RepositoryError("センターの設定に失敗しました", centerError);
      }

      const created = await this.findById(trackId);
      if (!created) {
        throw new RepositoryError("作成した楽曲の取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError("更新対象の楽曲が見つかりません", null);
      }

      const label = parseLabel(input.label);
      const generation = parseGeneration(input.label, input.generation);
      const releaseLinks = await resolveReleaseLinkTrackNumbers(
        supabase,
        parseReleaseLinks(input.releaseLinks),
        id
      );
      const credits = parseCredits(input);
      const formationRows = parseFormationRows(input.formationRows);
      const mv = parseMv(input.mv);
      const videos = parseVideos(input.videos);
      const costumes = parseCostumes(input.costumes);

      const writable = asWritableClient(supabase);
      const { error: rpcError } = await writable.rpc("update_track_with_relations_v2", {
        p_track_id: id,
        p_title: input.title.trim(),
        p_group_id: input.groupId,
        p_label: label,
        p_generation: generation,
        p_release_links: releaseLinks,
        p_credits: credits,
        p_formation_rows: formationRows,
        p_mv: mv,
        p_videos: videos,
        p_costumes: costumes,
      });

      if (rpcError) {
        throw new RepositoryError("楽曲の更新に失敗しました", rpcError);
      }

      const { error: centerError } = await writable.rpc("set_track_centers", {
        p_track_id: id,
        p_center_member_ids: input.centerMemberIds,
      });
      if (centerError) {
        throw new RepositoryError("センターの更新に失敗しました", centerError);
      }

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新後の楽曲取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const writable = asWritableClient(supabase);
      const { error } = await writable
        .from("orbit_tracks")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("楽曲の削除に失敗しました", error);
      }
    },

    async findByMemberId(memberId) {
      const { data: memberRows, error: memberRowsError } = await supabase
        .from("orbit_track_formation_members")
        .select("formation_row_id")
        .eq("member_id", memberId);

      if (memberRowsError) {
        throw new RepositoryError("参加楽曲の取得に失敗しました", memberRowsError);
      }

      const formationRowIds = uniqueStrings(
        ((memberRows as Array<{ formation_row_id: string }>) ?? []).map((row) => row.formation_row_id)
      );

      const trackIds = await resolveTrackIdsFromRowIds(formationRowIds);

      return findManyByIds(trackIds, SONG_LIST_SELECT);
    },

    async findCenterTrackIdsByMemberId(memberId) {
      const { data: centerRows, error: centerRowsError } = await supabase
        .from("orbit_track_formation_members")
        .select("formation_row_id")
        .eq("member_id", memberId)
        .eq("is_center", true);

      if (centerRowsError) {
        throw new RepositoryError("センター楽曲の取得に失敗しました", centerRowsError);
      }

      const centerRowIds = uniqueStrings(
        ((centerRows as Array<{ formation_row_id: string }>) ?? []).map((row) => row.formation_row_id)
      );

      return resolveTrackIdsFromRowIds(centerRowIds);
    },

    async findCalendarVideoItems() {
      type TrackRel = {
        id: string;
        title: string;
        orbit_groups: { name_ja: string } | { name_ja: string }[] | null;
      };
      const pickTrack = (rel: TrackRel | TrackRel[] | null): TrackRel | null =>
        Array.isArray(rel) ? (rel[0] ?? null) : rel;
      const groupNameOf = (track: TrackRel): string => {
        const group = Array.isArray(track.orbit_groups)
          ? track.orbit_groups[0]
          : track.orbit_groups;
        return group?.name_ja ?? "";
      };

      // MV配信日
      const { data: mvData, error: mvError } = await supabase
        .from("orbit_track_mvs")
        .select(
          "mv_url, published_on, orbit_tracks(id, title, orbit_groups(name_ja))"
        )
        .not("published_on", "is", null);
      if (mvError) {
        throw new RepositoryError("カレンダー用MVの取得に失敗しました", mvError);
      }

      // 関連動画の配信日
      const { data: videoData, error: videoError } = await supabase
        .from("orbit_track_videos")
        .select(
          "video_url, video_type, published_on, orbit_tracks(id, title, orbit_groups(name_ja))"
        )
        .not("published_on", "is", null);
      if (videoError) {
        throw new RepositoryError("カレンダー用動画の取得に失敗しました", videoError);
      }

      const items: CalendarVideoItem[] = [];
      for (const row of (mvData as
        | Array<{
            mv_url: string;
            published_on: string;
            orbit_tracks: TrackRel | TrackRel[] | null;
          }>
        | null) ?? []) {
        const track = pickTrack(row.orbit_tracks);
        if (!track) continue;
        items.push({
          trackId: track.id,
          trackTitle: track.title,
          groupNameJa: groupNameOf(track),
          videoType: "mv",
          url: row.mv_url,
          date: row.published_on,
        });
      }
      for (const row of (videoData as
        | Array<{
            video_url: string;
            video_type: string;
            published_on: string;
            orbit_tracks: TrackRel | TrackRel[] | null;
          }>
        | null) ?? []) {
        if (!isSongVideoType(row.video_type)) continue;
        const track = pickTrack(row.orbit_tracks);
        if (!track) continue;
        items.push({
          trackId: track.id,
          trackTitle: track.title,
          groupNameJa: groupNameOf(track),
          videoType: row.video_type,
          url: row.video_url,
          date: row.published_on,
        });
      }
      return items;
    },
  };
}
