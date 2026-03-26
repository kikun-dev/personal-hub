import type { SupabaseClient } from "@personal-hub/supabase";
import type {
  Release,
  CreateReleaseInput,
  ReleaseType,
  ReleaseListItem,
  ReleaseOption,
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

type ReleasePersonRow =
  | {
      display_name: string;
    }
  | Array<{
      display_name: string;
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

type ReleaseTrackRow = {
  track_number: number;
  orbit_tracks?:
    | {
        id: string;
        title: string;
      }
    | Array<{
        id: string;
        title: string;
      }>
    | null;
};

type ReleaseRow = {
  id: string;
  title: string;
  group_id: string;
  release_type: ReleaseType;
  numbering: number | null;
  release_date: string | null;
  artwork_path: string | null;
  orbit_people?: ReleasePersonRow | null;
  orbit_groups: ReleaseGroupRow;
  orbit_release_bonus_videos?: ReleaseBonusVideoRow[];
  orbit_release_members?: ReleaseMemberRow[];
  orbit_release_tracks?: ReleaseTrackRow[];
};

type ReleaseListRow = {
  id: string;
  title: string;
  group_id: string;
  release_type: ReleaseType;
  numbering: number | null;
  release_date: string | null;
  orbit_groups: ReleaseGroupRow;
  orbit_release_tracks?: Array<{ track_number: number }>;
};

type ReleaseOptionRow = {
  id: string;
  title: string;
  release_type: ReleaseType;
  orbit_release_members?: ReleaseMemberRow[];
};

const RELEASE_LIST_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  artwork_path,
  orbit_people(display_name),
  orbit_groups(name_ja, color),
  orbit_release_members(member_id, orbit_members(name_ja)),
  orbit_release_tracks(track_number)
`;

const RELEASE_DETAIL_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  artwork_path,
  orbit_people(display_name),
  orbit_groups(name_ja, color),
  orbit_release_bonus_videos(id, edition, title, description, sort_order),
  orbit_release_members(member_id, orbit_members(name_ja)),
  orbit_release_tracks(track_number, orbit_tracks(id, title))
`;

const RELEASE_PUBLIC_LIST_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  orbit_groups(name_ja, color),
  orbit_release_tracks(track_number)
`;

const RELEASE_OPTION_SELECT = `
  id,
  title,
  release_type,
  orbit_release_members(member_id, orbit_members(name_ja))
`;

function mapToRelease(row: ReleaseRow): Release {
  const artworkPerson = row.orbit_people
    ? Array.isArray(row.orbit_people)
      ? row.orbit_people[0]
      : row.orbit_people
    : null;
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
    artworkPersonName: artworkPerson?.display_name ?? null,
    trackCount: row.orbit_release_tracks?.length ?? 0,
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
    tracks: (row.orbit_release_tracks ?? [])
      .map((item) => {
        const track = Array.isArray(item.orbit_tracks)
          ? item.orbit_tracks[0]
          : item.orbit_tracks;
        if (!track) return null;
        return {
          trackId: track.id,
          trackTitle: track.title,
          trackNumber: item.track_number,
        };
      })
      .filter((item): item is {
        trackId: string;
        trackTitle: string;
        trackNumber: number;
      } => Boolean(item))
      .sort((a, b) => a.trackNumber - b.trackNumber),
  };
}

function mapToReleaseListItem(row: ReleaseListRow): ReleaseListItem {
  const group = Array.isArray(row.orbit_groups)
    ? row.orbit_groups[0]
    : row.orbit_groups;

  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    groupNameJa: group?.name_ja ?? "",
    groupColor: group?.color ?? "#6B7280",
    releaseType: row.release_type,
    numbering: row.numbering,
    releaseDate: row.release_date,
    trackCount: row.orbit_release_tracks?.length ?? 0,
  };
}

function mapToReleaseOption(row: ReleaseOptionRow): ReleaseOption {
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
    releaseType: row.release_type,
    participantMemberIds: participants.map((member) => member.memberId),
    participantMemberNames: participants.map((member) => member.memberNameJa),
  };
}

function toTrackLinkRpcInput(
  trackLinks: CreateReleaseInput["trackLinks"]
): Array<{
  trackId: string;
  trackNumber: number;
}> {
  return trackLinks.map((trackLink) => ({
    trackId: trackLink.trackId,
    trackNumber: Number(trackLink.trackNumber),
  }));
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

function toBonusVideoRpcInput(
  bonusVideos: CreateReleaseInput["bonusVideos"]
): Array<{
  edition: string;
  title: string;
  description: string | null;
}> {
  return bonusVideos.map((bonus) => ({
    edition: bonus.edition.trim(),
    title: bonus.title.trim(),
    description: bonus.description.trim() || null,
  }));
}

export function createReleaseRepository(
  supabase: SupabaseClient
): ReleaseRepository {
  return {
    async findAll(filters) {
      let query = supabase
        .from("orbit_releases")
        .select(RELEASE_LIST_SELECT)
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

    async findPublicList(filters) {
      let query = supabase
        .from("orbit_releases")
        .select(RELEASE_PUBLIC_LIST_SELECT)
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
        throw new RepositoryError("公開向けリリース一覧の取得に失敗しました", error);
      }

      return (data as ReleaseListRow[]).map(mapToReleaseListItem);
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_releases")
        .select(RELEASE_OPTION_SELECT)
        .order("release_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw new RepositoryError("リリース候補の取得に失敗しました", error);
      }

      return ((data as ReleaseOptionRow[] | null) ?? []).map(mapToReleaseOption);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_releases")
        .select(RELEASE_DETAIL_SELECT)
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

      const { data: releaseId, error: rpcError } = await supabase.rpc("create_release_with_relations", {
        p_title: input.title.trim(),
        p_group_id: input.groupId,
        p_release_type: input.releaseType,
        p_numbering: numbering,
        p_release_date: input.releaseDate || null,
        p_artwork_path: input.artworkPath || null,
        p_artwork_person_name: input.artworkPersonName.trim() || null,
        p_bonus_videos: toBonusVideoRpcInput(input.bonusVideos),
        p_member_ids: input.participantMemberIds,
        p_track_links: toTrackLinkRpcInput(input.trackLinks),
      });

      if (rpcError) {
        throw new RepositoryError("リリースの作成に失敗しました", rpcError);
      }

      if (typeof releaseId !== "string") {
        throw new RepositoryError("作成したリリースIDの取得に失敗しました", null);
      }

      const created = await this.findById(releaseId);
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

      const { error: rpcError } = await supabase.rpc("update_release_with_relations", {
        p_release_id: id,
        p_title: input.title.trim(),
        p_group_id: input.groupId,
        p_release_type: input.releaseType,
        p_numbering: numbering,
        p_release_date: input.releaseDate || null,
        p_artwork_path: input.artworkPath || null,
        p_artwork_person_name: input.artworkPersonName.trim() || null,
        p_bonus_videos: toBonusVideoRpcInput(input.bonusVideos),
        p_member_ids: input.participantMemberIds,
        p_track_links: toTrackLinkRpcInput(input.trackLinks),
      });

      if (rpcError) {
        throw new RepositoryError("リリースの更新に失敗しました", rpcError);
      }

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
