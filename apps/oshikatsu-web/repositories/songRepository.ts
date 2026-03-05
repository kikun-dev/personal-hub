import type { SupabaseClient } from "@personal-hub/supabase";
import type { Song, SongMember, CreateSongInput } from "@/types/song";
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
  orbit_song_groups?: {
    group_id: string;
    orbit_groups: { name_ja: string };
  }[];
  orbit_song_members?: SongMemberRow[];
};

type SongMemberWrite = {
  memberId: string;
  position: string;
  positionOrder: number;
  isCenter: boolean;
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

const SONG_LIST_SELECT = `
  id, title, lyrics_by, music_by, release_date,
  orbit_song_groups(group_id, orbit_groups(name_ja))
`;

const SONG_DETAIL_SELECT = `
  id, title, lyrics_by, music_by, release_date,
  orbit_song_groups(group_id, orbit_groups(name_ja)),
  orbit_song_members(
    id, member_id, position, position_order, is_center,
    orbit_members(name_ja)
  )
`;

function parsePositionOrder(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new RepositoryError("position_order が不正です", { value });
  }
  return parsed;
}

function toSongMemberWrites(
  members: CreateSongInput["members"]
): SongMemberWrite[] {
  return members.map((m) => ({
    memberId: m.memberId,
    position: m.position,
    positionOrder: parsePositionOrder(m.positionOrder),
    isCenter: m.isCenter,
  }));
}

function toSongMemberWritesFromSongMembers(members: SongMember[]): SongMemberWrite[] {
  return members.map((m) => ({
    memberId: m.memberId,
    position: m.position,
    positionOrder: m.positionOrder,
    isCenter: m.isCenter,
  }));
}

export function createSongRepository(
  supabase: SupabaseClient
): SongRepository {
  async function insertSongGroups(songId: string, groupIds: string[]): Promise<void> {
    if (groupIds.length === 0) return;

    const { error } = await supabase
      .from("orbit_song_groups")
      .insert(
        groupIds.map((groupId) => ({
          song_id: songId,
          group_id: groupId,
        }))
      );

    if (error) {
      throw new RepositoryError("楽曲のグループ登録に失敗しました", error);
    }
  }

  async function replaceSongGroups(songId: string, groupIds: string[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_song_groups")
      .delete()
      .eq("song_id", songId);

    if (deleteError) {
      throw new RepositoryError("楽曲のグループ更新に失敗しました", deleteError);
    }

    await insertSongGroups(songId, groupIds);
  }

  async function insertSongMembers(
    songId: string,
    members: SongMemberWrite[]
  ): Promise<void> {
    if (members.length === 0) return;

    const { error } = await supabase
      .from("orbit_song_members")
      .insert(
        members.map((m) => ({
          song_id: songId,
          member_id: m.memberId,
          position: m.position,
          position_order: m.positionOrder,
          is_center: m.isCenter,
        }))
      );

    if (error) {
      throw new RepositoryError("楽曲のメンバー登録に失敗しました", error);
    }
  }

  async function replaceSongMembers(
    songId: string,
    members: SongMemberWrite[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_song_members")
      .delete()
      .eq("song_id", songId);

    if (deleteError) {
      throw new RepositoryError("楽曲のメンバー更新に失敗しました", deleteError);
    }

    await insertSongMembers(songId, members);
  }

  async function restoreSongSnapshot(snapshot: Song): Promise<void> {
    const { error: songError } = await supabase
      .from("orbit_songs")
      .update({
        title: snapshot.title,
        lyrics_by: snapshot.lyricsBy || null,
        music_by: snapshot.musicBy || null,
        release_date: snapshot.releaseDate || null,
      })
      .eq("id", snapshot.id);

    if (songError) {
      throw new RepositoryError("楽曲のロールバックに失敗しました", songError);
    }

    await replaceSongGroups(snapshot.id, snapshot.groupIds);
    await replaceSongMembers(
      snapshot.id,
      toSongMemberWritesFromSongMembers(snapshot.members)
    );
  }

  return {
    async findAll(filters) {
      let query = supabase
        .from("orbit_songs")
        .select(SONG_LIST_SELECT)
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
        .select(SONG_DETAIL_SELECT)
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
      const memberWrites = toSongMemberWrites(input.members);
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

      try {
        await insertSongGroups(song.id, input.groupIds);
        await insertSongMembers(song.id, memberWrites);
      } catch (e) {
        await supabase.from("orbit_songs").delete().eq("id", song.id);
        if (e instanceof RepositoryError) {
          throw e;
        }
        throw new RepositoryError("楽曲の関連データ登録に失敗しました", e);
      }

      const created = await this.findById(song.id);
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

      try {
        const memberWrites = toSongMemberWrites(input.members);
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

        await replaceSongGroups(id, input.groupIds);
        await replaceSongMembers(id, memberWrites);
      } catch (e) {
        try {
          await restoreSongSnapshot(existing);
        } catch (rollbackError) {
          throw new RepositoryError("楽曲更新のロールバックに失敗しました", {
            originalError: e,
            rollbackError,
          });
        }
        if (e instanceof RepositoryError) {
          throw e;
        }
        throw new RepositoryError("楽曲の更新に失敗しました", e);
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
        .select(SONG_DETAIL_SELECT)
        .in("id", songIds)
        .order("title");

      if (error) {
        throw new RepositoryError("楽曲の取得に失敗しました", error);
      }

      return (data as unknown as SongRow[]).map(mapToSong);
    },
  };
}
