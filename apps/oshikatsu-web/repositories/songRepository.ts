import type { SupabaseClient } from "@personal-hub/supabase";
import type { Song, SongMember } from "@/types/song";
import type { SongRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";
import type { SongPosition } from "@/lib/constants";

type SongMemberRow = {
  id: string;
  member_id: string;
  position: string;
  position_order: number;
  is_center: boolean;
  orbit_members: {
    name_ja: string;
  };
};

type SongRow = {
  id: string;
  title: string;
  lyrics_by: string | null;
  music_by: string | null;
  release_date: string | null;
  orbit_song_groups: {
    group_id: string;
    orbit_groups: { name_ja: string };
  }[];
  orbit_song_members: SongMemberRow[];
};

function mapToSongMember(row: SongMemberRow): SongMember {
  return {
    id: row.id,
    memberId: row.member_id,
    memberNameJa: row.orbit_members.name_ja,
    position: row.position as SongPosition,
    positionOrder: row.position_order,
    isCenter: row.is_center,
  };
}

function mapToSong(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    lyricsBy: row.lyrics_by,
    musicBy: row.music_by,
    releaseDate: row.release_date,
    groupIds: (row.orbit_song_groups ?? []).map((g) => g.group_id),
    groupNames: (row.orbit_song_groups ?? []).map(
      (g) => g.orbit_groups.name_ja
    ),
    members: (row.orbit_song_members ?? []).map(mapToSongMember),
  };
}

const SONG_SELECT = `
  id, title, lyrics_by, music_by, release_date,
  orbit_song_groups(group_id, orbit_groups(name_ja)),
  orbit_song_members(
    id, member_id, position, position_order, is_center,
    orbit_members(name_ja)
  )
`;

export function createSongRepository(
  supabase: SupabaseClient
): SongRepository {
  return {
    async findAll(filters) {
      let query = supabase
        .from("orbit_songs")
        .select(SONG_SELECT)
        .order("title");

      if (filters?.groupId) {
        query = query.filter(
          "orbit_song_groups.group_id",
          "eq",
          filters.groupId
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError("楽曲の取得に失敗しました", error);
      }

      // Supabase の型推論が実際のレスポンス構造と一致しないため unknown 経由でキャスト
      let songs = (data as unknown as SongRow[]).map(mapToSong);

      // グループフィルタの場合、そのグループに属する楽曲のみ
      if (filters?.groupId) {
        songs = songs.filter((s) => s.groupIds.length > 0);
      }

      return songs;
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_songs")
        .select(SONG_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("楽曲の取得に失敗しました", error);
      }
      return mapToSong(data as unknown as SongRow);
    },

    async create(input) {
      const { data: song, error: songError } = await supabase
        .from("orbit_songs")
        .insert({
          title: input.title,
          lyrics_by: input.lyricsBy || null,
          music_by: input.musicBy || null,
          release_date: input.releaseDate || null,
        })
        .select("id")
        .single();

      if (songError) {
        throw new RepositoryError("楽曲の作成に失敗しました", songError);
      }

      if (input.groupIds.length > 0) {
        const { error: groupError } = await supabase
          .from("orbit_song_groups")
          .insert(
            input.groupIds.map((groupId) => ({
              song_id: song.id,
              group_id: groupId,
            }))
          );
        if (groupError) {
          await supabase.from("orbit_songs").delete().eq("id", song.id);
          throw new RepositoryError(
            "楽曲のグループ登録に失敗しました",
            groupError
          );
        }
      }

      if (input.members.length > 0) {
        const { error: memberError } = await supabase
          .from("orbit_song_members")
          .insert(
            input.members.map((m) => ({
              song_id: song.id,
              member_id: m.memberId,
              position: m.position,
              position_order: Number(m.positionOrder) || 0,
              is_center: m.isCenter,
            }))
          );
        if (memberError) {
          await supabase.from("orbit_songs").delete().eq("id", song.id);
          throw new RepositoryError(
            "楽曲のメンバー登録に失敗しました",
            memberError
          );
        }
      }

      const created = await this.findById(song.id);
      if (!created) {
        throw new RepositoryError("作成した楽曲の取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const { error: songError } = await supabase
        .from("orbit_songs")
        .update({
          title: input.title,
          lyrics_by: input.lyricsBy || null,
          music_by: input.musicBy || null,
          release_date: input.releaseDate || null,
        })
        .eq("id", id);

      if (songError) {
        throw new RepositoryError("楽曲の更新に失敗しました", songError);
      }

      // グループ: 全削除→再挿入
      const { error: deleteGroupError } = await supabase
        .from("orbit_song_groups")
        .delete()
        .eq("song_id", id);
      if (deleteGroupError) {
        throw new RepositoryError(
          "楽曲のグループ更新に失敗しました",
          deleteGroupError
        );
      }

      if (input.groupIds.length > 0) {
        const { error: groupError } = await supabase
          .from("orbit_song_groups")
          .insert(
            input.groupIds.map((groupId) => ({
              song_id: id,
              group_id: groupId,
            }))
          );
        if (groupError) {
          throw new RepositoryError(
            "楽曲のグループ登録に失敗しました",
            groupError
          );
        }
      }

      // メンバー: 全削除→再挿入
      const { error: deleteMemberError } = await supabase
        .from("orbit_song_members")
        .delete()
        .eq("song_id", id);
      if (deleteMemberError) {
        throw new RepositoryError(
          "楽曲のメンバー更新に失敗しました",
          deleteMemberError
        );
      }

      if (input.members.length > 0) {
        const { error: memberError } = await supabase
          .from("orbit_song_members")
          .insert(
            input.members.map((m) => ({
              song_id: id,
              member_id: m.memberId,
              position: m.position,
              position_order: Number(m.positionOrder) || 0,
              is_center: m.isCenter,
            }))
          );
        if (memberError) {
          throw new RepositoryError(
            "楽曲のメンバー登録に失敗しました",
            memberError
          );
        }
      }

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新した楽曲の取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const { error } = await supabase
        .from("orbit_songs")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("楽曲の削除に失敗しました", error);
      }
    },

    async findByMemberId(memberId) {
      const { data: ids, error: memberError } = await supabase
        .from("orbit_song_members")
        .select("song_id")
        .eq("member_id", memberId);

      if (memberError) {
        throw new RepositoryError("楽曲の取得に失敗しました", memberError);
      }

      if (!ids || ids.length === 0) return [];

      const songIds = ids.map((row) => row.song_id);
      const { data, error } = await supabase
        .from("orbit_songs")
        .select(SONG_SELECT)
        .in("id", songIds)
        .order("title");

      if (error) {
        throw new RepositoryError("楽曲の取得に失敗しました", error);
      }

      return (data as unknown as SongRow[]).map(mapToSong);
    },
  };
}
