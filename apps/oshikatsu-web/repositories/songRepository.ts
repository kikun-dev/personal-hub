import type { TypedSupabaseClient } from "@personal-hub/supabase";
import type { Song, SongOption, CalendarVideoItem } from "@/types/song";
import { isSongVideoType } from "@/types/song";
import type { SongRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";
import { SONG_LIST_SELECT, SONG_DETAIL_SELECT, SONG_PUBLIC_LIST_SELECT } from "./songMapper";
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

const SONG_OPTION_SELECT = "id, title" as const;
const RELEASE_TRACK_NUMBER_SELECT = "track_number" as const;
const FORMATION_ROW_ID_SELECT = "formation_row_id" as const;
const FORMATION_ID_SELECT = "formation_id" as const;
const TRACK_ID_SELECT = "track_id" as const;

const MV_CALENDAR_SELECT = `
  mv_url,
  published_on,
  orbit_tracks(id, title, orbit_groups(name_ja))
` as const;

const VIDEO_CALENDAR_SELECT = `
  video_url,
  video_type,
  published_on,
  orbit_tracks(id, title, orbit_groups(name_ja))
` as const;

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
      .select(RELEASE_TRACK_NUMBER_SELECT)
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
    const maxNumber = data.length > 0 ? data[0].track_number : 0;
    resolved.push({ releaseId: link.releaseId, trackNumber: maxNumber + 1 });
  }
  return resolved;
}

export function createSongRepository(
  supabase: OrbitReadClient
): SongRepository {
  async function findManyByIds(ids: string[]): Promise<Song[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("orbit_tracks")
      .select(SONG_LIST_SELECT)
      .in("id", ids)
      .order("title");

    if (error) {
      throw new RepositoryError("楽曲情報の取得に失敗しました", error);
    }

    return data.map(mapSong);
  }

  // フォーメーション列(formation_row)の集合から、所属する楽曲(track)IDを解決する
  async function resolveTrackIdsFromRowIds(rowIds: string[]): Promise<string[]> {
    if (rowIds.length === 0) return [];

    const { data: formationRows, error: formationRowsError } = await supabase
      .from("orbit_track_formation_rows")
      .select(FORMATION_ID_SELECT)
      .in("id", rowIds);

    if (formationRowsError) {
      throw new RepositoryError("参加楽曲の取得に失敗しました", formationRowsError);
    }

    const formationIds = uniqueStrings(formationRows.map((row) => row.formation_id));

    if (formationIds.length === 0) return [];

    const { data: formations, error: formationsError } = await supabase
      .from("orbit_track_formations")
      .select(TRACK_ID_SELECT)
      .in("id", formationIds);

    if (formationsError) {
      throw new RepositoryError("参加楽曲の取得に失敗しました", formationsError);
    }

    return uniqueStrings(formations.map((row) => row.track_id));
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

      return data.map(mapSong);
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

      return data.map(mapToSongListItem);
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_tracks")
        .select(SONG_OPTION_SELECT)
        .order("title");

      if (error) {
        throw new RepositoryError("楽曲候補の取得に失敗しました", error);
      }

      return data.map((row) => ({
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

      return mapSong(data);
    },

    async create(input) {
      // 対象グループが「その他」受け皿グループ（is_catchall）かを DB で権威的に判定する
      // （クライアント入力を信用しない）。catch-all 楽曲はリレーションを一切持たず、
      // release-link 必須の v2 RPC を通せないため、orbit_tracks へ直接 insert する（#264）。
      const { data: groupRow, error: groupError } = await supabase
        .from("orbit_groups")
        .select("is_catchall")
        .eq("id", input.groupId)
        .single();
      if (groupError) {
        throw new RepositoryError("グループの取得に失敗しました", groupError);
      }
      const isCatchall = groupRow.is_catchall;

      if (isCatchall) {
        const { data: inserted, error: insertError } = await asWritableClient(supabase)
          .from("orbit_tracks")
          .insert({
            title: input.title.trim(),
            group_id: input.groupId,
            artist_name: input.artistName.trim() || null,
            note: input.note.trim() || null,
          })
          .select("id")
          .single();
        if (insertError) {
          throw new RepositoryError("楽曲の作成に失敗しました", insertError);
        }
        const created = await this.findById(inserted.id);
        if (!created) {
          throw new RepositoryError("作成した楽曲の取得に失敗しました", null);
        }
        return created;
      }

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

      // 生成型上 create_track_with_relations_v2 の p_label / p_generation は non-null な
      // string になっているが、これは PostgREST の RPC スカラー引数の型生成が NULL 許容を
      // 反映しない既知の制約であり、関数自体は null を受け付ける（label/generation は
      // どちらも未指定なら null で送る想定）。ペイロード側の誤りではないため、ここでは
      // TypedSupabaseClient にせず asWritableClient の返り値（未typed）のまま呼び出す。
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

      // set_track_centers は p_track_id（非null文字列）/ p_center_member_ids（Json）とも
      // 実ペイロードと不一致が無いため、typed client で呼び出す。
      const centerClient: TypedSupabaseClient = asWritableClient(supabase);
      const { error: centerError } = await centerClient.rpc("set_track_centers", {
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

      // create と同様、対象グループが catch-all かを DB で権威的に判定する。
      // catch-all 楽曲はリレーションを持たず v2 RPC を通せないため直接 update する。
      // なお通常楽曲↔catch-all のグループ変換は DB トリガ制約上できないため対象外（#264）。
      const { data: groupRow, error: groupError } = await supabase
        .from("orbit_groups")
        .select("is_catchall")
        .eq("id", input.groupId)
        .single();
      if (groupError) {
        throw new RepositoryError("グループの取得に失敗しました", groupError);
      }
      const isCatchall = groupRow.is_catchall;

      if (isCatchall) {
        const { error: updateError } = await asWritableClient(supabase)
          .from("orbit_tracks")
          .update({
            title: input.title.trim(),
            group_id: input.groupId,
            artist_name: input.artistName.trim() || null,
            note: input.note.trim() || null,
          })
          .eq("id", id);
        if (updateError) {
          throw new RepositoryError("楽曲の更新に失敗しました", updateError);
        }
        const updated = await this.findById(id);
        if (!updated) {
          throw new RepositoryError("更新後の楽曲取得に失敗しました", null);
        }
        return updated;
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

      // update_track_with_relations_v2 も create 同様、p_label / p_generation の
      // NULL 許容が生成型に反映されない既知の制約があるため未typedのまま呼び出す。
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

      const centerClient: TypedSupabaseClient = asWritableClient(supabase);
      const { error: centerError } = await centerClient.rpc("set_track_centers", {
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
        .select(FORMATION_ROW_ID_SELECT)
        .eq("member_id", memberId);

      if (memberRowsError) {
        throw new RepositoryError("参加楽曲の取得に失敗しました", memberRowsError);
      }

      const formationRowIds = uniqueStrings(
        memberRows.map((row) => row.formation_row_id)
      );

      const trackIds = await resolveTrackIdsFromRowIds(formationRowIds);

      return findManyByIds(trackIds);
    },

    async findCenterTrackIdsByMemberId(memberId) {
      const { data: centerRows, error: centerRowsError } = await supabase
        .from("orbit_track_formation_members")
        .select(FORMATION_ROW_ID_SELECT)
        .eq("member_id", memberId)
        .eq("is_center", true);

      if (centerRowsError) {
        throw new RepositoryError("センター楽曲の取得に失敗しました", centerRowsError);
      }

      const centerRowIds = uniqueStrings(
        centerRows.map((row) => row.formation_row_id)
      );

      return resolveTrackIdsFromRowIds(centerRowIds);
    },

    async findCalendarVideoItems() {
      // MV配信日
      const { data: mvData, error: mvError } = await supabase
        .from("orbit_track_mvs")
        .select(MV_CALENDAR_SELECT)
        .not("published_on", "is", null);
      if (mvError) {
        throw new RepositoryError("カレンダー用MVの取得に失敗しました", mvError);
      }

      // 関連動画の配信日
      const { data: videoData, error: videoError } = await supabase
        .from("orbit_track_videos")
        .select(VIDEO_CALENDAR_SELECT)
        .not("published_on", "is", null);
      if (videoError) {
        throw new RepositoryError("カレンダー用動画の取得に失敗しました", videoError);
      }

      const items: CalendarVideoItem[] = [];
      for (const row of mvData) {
        // published_on は .not(..., "is", null) で非null行のみに絞っているが、
        // 生成型は列自体のnull許容（string | null）をそのまま反映するため、
        // クエリによる絞り込みを反映した cast として残す。
        items.push({
          trackId: row.orbit_tracks.id,
          trackTitle: row.orbit_tracks.title,
          groupNameJa: row.orbit_tracks.orbit_groups.name_ja,
          videoType: "mv",
          url: row.mv_url,
          date: row.published_on as string,
        });
      }
      for (const row of videoData) {
        if (!isSongVideoType(row.video_type)) continue;
        items.push({
          trackId: row.orbit_tracks.id,
          trackTitle: row.orbit_tracks.title,
          groupNameJa: row.orbit_tracks.orbit_groups.name_ja,
          videoType: row.video_type,
          url: row.video_url,
          date: row.published_on as string,
        });
      }
      return items;
    },
  };
}
