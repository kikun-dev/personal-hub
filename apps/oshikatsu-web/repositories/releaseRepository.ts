import type { SupabaseClient } from "@personal-hub/supabase";
import type {
  Release,
  CreateReleaseInput,
  CreateReleaseBonusVideoInput,
  ReleaseType,
} from "@/types/release";
import type { ReleaseRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type ReleaseGroupRow =
  | {
      name_ja: string;
      color: string;
    }
  | Array<{
      name_ja: string;
      color: string;
    }>;

type ReleaseBonusVideoRow = {
  id: string;
  edition: string;
  title: string;
  description: string | null;
  sort_order: number;
};

type ReleaseMemberNameRow =
  | {
      name_ja: string;
    }
  | Array<{
      name_ja: string;
    }>;

type ReleaseMemberRow = {
  member_id: string;
  orbit_members: ReleaseMemberNameRow;
};

type ReleaseRow = {
  id: string;
  title: string;
  group_id: string;
  release_type: ReleaseType;
  numbering: number | null;
  release_date: string | null;
  artwork_path: string | null;
  orbit_groups: ReleaseGroupRow;
  orbit_release_bonus_videos?: ReleaseBonusVideoRow[];
  orbit_release_members?: ReleaseMemberRow[];
};

const RELEASE_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  artwork_path,
  orbit_groups(name_ja, color),
  orbit_release_bonus_videos(id, edition, title, description, sort_order),
  orbit_release_members(member_id, orbit_members(name_ja))
`;

function mapToRelease(row: ReleaseRow): Release {
  const group = Array.isArray(row.orbit_groups)
    ? row.orbit_groups[0]
    : row.orbit_groups;

  const participants = (row.orbit_release_members ?? []).map((member) => {
    const orbitMember = Array.isArray(member.orbit_members)
      ? member.orbit_members[0]
      : member.orbit_members;
    return {
      memberId: member.member_id,
      memberNameJa: orbitMember?.name_ja ?? "",
    };
  });

  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    groupNameJa: group?.name_ja ?? "",
    groupColor: group?.color ?? "#6B7280",
    releaseType: row.release_type,
    numbering: row.numbering,
    releaseDate: row.release_date,
    artworkPath: row.artwork_path,
    participantMemberIds: participants.map((member) => member.memberId),
    participantMemberNames: participants.map((member) => member.memberNameJa),
    bonusVideos: (row.orbit_release_bonus_videos ?? [])
      .map((bonus) => ({
        id: bonus.id,
        edition: bonus.edition,
        title: bonus.title,
        description: bonus.description,
        sortOrder: bonus.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function toNumbering(
  releaseType: CreateReleaseInput["releaseType"],
  numbering: string
): number | null {
  if (releaseType !== "single" && releaseType !== "album") {
    return null;
  }

  return Number(numbering);
}

function toBonusVideoInserts(
  releaseId: string,
  bonusVideos: CreateReleaseBonusVideoInput[]
): Array<{
    release_id: string;
    edition: string;
    title: string;
    description: string | null;
    sort_order: number;
  }> {
  return bonusVideos.map((bonus, index) => ({
    release_id: releaseId,
    edition: bonus.edition.trim(),
    title: bonus.title.trim(),
    description: bonus.description.trim() || null,
    sort_order: index,
  }));
}

function toReleaseMemberInserts(
  releaseId: string,
  memberIds: string[]
): Array<{
    release_id: string;
    member_id: string;
  }> {
  return memberIds.map((memberId) => ({
    release_id: releaseId,
    member_id: memberId,
  }));
}

export function createReleaseRepository(
  supabase: SupabaseClient
): ReleaseRepository {
  async function replaceBonusVideos(
    releaseId: string,
    bonusVideos: CreateReleaseInput["bonusVideos"]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_release_bonus_videos")
      .delete()
      .eq("release_id", releaseId);

    if (deleteError) {
      throw new RepositoryError("特典映像の更新に失敗しました", deleteError);
    }

    if (bonusVideos.length === 0) return;

    const { error: insertError } = await supabase
      .from("orbit_release_bonus_videos")
      .insert(toBonusVideoInserts(releaseId, bonusVideos));

    if (insertError) {
      throw new RepositoryError("特典映像の登録に失敗しました", insertError);
    }
  }

  async function replaceReleaseMembers(
    releaseId: string,
    memberIds: string[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_release_members")
      .delete()
      .eq("release_id", releaseId);

    if (deleteError) {
      throw new RepositoryError("参加メンバーの更新に失敗しました", deleteError);
    }

    if (memberIds.length === 0) return;

    const { error: insertError } = await supabase
      .from("orbit_release_members")
      .insert(toReleaseMemberInserts(releaseId, memberIds));

    if (insertError) {
      throw new RepositoryError("参加メンバーの登録に失敗しました", insertError);
    }
  }

  return {
    async findAll(filters) {
      let query = supabase
        .from("orbit_releases")
        .select(RELEASE_SELECT)
        .order("release_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters?.groupId) {
        query = query.eq("group_id", filters.groupId);
      }
      if (filters?.releaseType) {
        query = query.eq("release_type", filters.releaseType);
      }

      const { data, error } = await query;
      if (error) {
        throw new RepositoryError("リリース一覧の取得に失敗しました", error);
      }

      return (data as ReleaseRow[]).map(mapToRelease);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_releases")
        .select(RELEASE_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("リリースの取得に失敗しました", error);
      }

      return mapToRelease(data as ReleaseRow);
    },

    async create(input) {
      const numbering = toNumbering(input.releaseType, input.numbering);

      const { data, error } = await supabase
        .from("orbit_releases")
        .insert({
          title: input.title.trim(),
          group_id: input.groupId,
          release_type: input.releaseType,
          numbering,
          release_date: input.releaseDate || null,
          artwork_path: input.artworkPath || null,
        })
        .select("id")
        .single();

      if (error) {
        throw new RepositoryError("リリースの作成に失敗しました", error);
      }

      try {
        await replaceBonusVideos(data.id, input.bonusVideos);
        await replaceReleaseMembers(data.id, input.participantMemberIds);
      } catch (e) {
        await supabase.from("orbit_releases").delete().eq("id", data.id);
        throw e;
      }

      const created = await this.findById(data.id);
      if (!created) {
        throw new RepositoryError("作成したリリースの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError("更新対象のリリースが見つかりません", null);
      }

      const numbering = toNumbering(input.releaseType, input.numbering);

      const { error } = await supabase
        .from("orbit_releases")
        .update({
          title: input.title.trim(),
          group_id: input.groupId,
          release_type: input.releaseType,
          numbering,
          release_date: input.releaseDate || null,
          artwork_path: input.artworkPath || null,
        })
        .eq("id", id);

      if (error) {
        throw new RepositoryError("リリースの更新に失敗しました", error);
      }

      await replaceBonusVideos(id, input.bonusVideos);
      await replaceReleaseMembers(id, input.participantMemberIds);

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新後のリリース取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const { error } = await supabase
        .from("orbit_releases")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("リリースの削除に失敗しました", error);
      }
    },
  };
}
