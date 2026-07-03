import type {
  Release,
  CreateReleaseInput,
  ReleaseTrack,
  ReleaseType,
  ReleaseListItem,
  ReleaseOption,
} from "@/types/release";
import { compareByGenerationThenName } from "@/lib/memberOrder";
import { isSongLabel, isSongVideoType, type SongLabel } from "@/types/song";

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

type ReleaseMemberGroupRow = {
  group_id: string;
  generation: string | null;
};

type ReleaseMemberNameRow =
  | {
      name_ja: string;
      name_kana: string;
      orbit_member_groups: ReleaseMemberGroupRow[] | null;
    }
  | Array<{
      name_ja: string;
      name_kana: string;
      orbit_member_groups: ReleaseMemberGroupRow[] | null;
    }>;

type ReleaseMemberRow = {
  member_id: string;
  orbit_members: ReleaseMemberNameRow;
};

type ReleaseMemberPositionRow = {
  member_id: string;
  is_front_special: boolean;
  is_hiatus: boolean;
};

type TrackMvRow = {
  id: string;
};

type TrackVideoRow = {
  video_type: string;
};

type ReleaseTrackRel = {
  id: string;
  title: string;
  label: string | null;
  generation: string | null;
  orbit_groups: ReleaseGroupRow;
  orbit_track_mvs?: TrackMvRow | TrackMvRow[] | null;
  orbit_track_videos?: TrackVideoRow[] | null;
};

type ReleaseTrackRow = {
  track_number: number;
  orbit_tracks?: ReleaseTrackRel | ReleaseTrackRel[] | null;
};

export type ReleaseRow = {
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
  orbit_release_member_positions?: ReleaseMemberPositionRow[];
  orbit_release_tracks?: ReleaseTrackRow[];
};

export type ReleaseListRow = {
  id: string;
  title: string;
  group_id: string;
  release_type: ReleaseType;
  numbering: number | null;
  release_date: string | null;
  orbit_groups: ReleaseGroupRow;
  orbit_release_tracks?: Array<{ track_number: number }>;
};

type ReleaseOptionMemberRow = {
  member_id: string;
  orbit_members:
    | {
        name_ja: string;
        name_kana: string;
        orbit_member_groups: ReleaseMemberGroupRow[] | null;
      }
    | {
        name_ja: string;
        name_kana: string;
        orbit_member_groups: ReleaseMemberGroupRow[] | null;
      }[]
    | null;
};

export type ReleaseOptionRow = {
  id: string;
  title: string;
  release_type: ReleaseType;
  group_id: string;
  orbit_release_members?: ReleaseOptionMemberRow[];
};

function hasMv(mvRel: TrackMvRow | TrackMvRow[] | null | undefined): boolean {
  if (!mvRel) return false;
  return Array.isArray(mvRel) ? mvRel.length > 0 : true;
}

function hasTrackVideoType(
  videos: TrackVideoRow[] | null | undefined,
  type: "dance_practice" | "call"
): boolean {
  return (videos ?? []).some(
    (video) => isSongVideoType(video.video_type) && video.video_type === type
  );
}

export function mapToRelease(row: ReleaseRow): Release {
  const artworkPerson = row.orbit_people
    ? Array.isArray(row.orbit_people)
      ? row.orbit_people[0]
      : row.orbit_people
    : null;
  const group = Array.isArray(row.orbit_groups)
    ? row.orbit_groups[0]
    : row.orbit_groups;

  const participants = (row.orbit_release_members ?? [])
    .map((member) => {
      const orbitMember = Array.isArray(member.orbit_members)
        ? member.orbit_members[0]
        : member.orbit_members;
      // リリースのグループでの期を採用（無ければ null）
      const membership = (orbitMember?.orbit_member_groups ?? []).find(
        (mg) => mg.group_id === row.group_id
      );
      return {
        memberId: member.member_id,
        memberNameJa: orbitMember?.name_ja ?? "",
        memberNameKana: orbitMember?.name_kana ?? "",
        generation: membership?.generation ?? null,
      };
    })
    .sort((a, b) =>
      compareByGenerationThenName(
        { generation: a.generation, nameKana: a.memberNameKana },
        { generation: b.generation, nameKana: b.memberNameKana }
      )
    );

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
    participantMemberGenerations: participants.map((member) => member.generation),
    memberPositions: (row.orbit_release_member_positions ?? []).map((position) => ({
      memberId: position.member_id,
      isFrontSpecial: position.is_front_special,
      isHiatus: position.is_hiatus,
    })),
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
        const trackGroup = Array.isArray(track.orbit_groups)
          ? track.orbit_groups[0]
          : track.orbit_groups;
        return {
          trackId: track.id,
          trackTitle: track.title,
          trackNumber: item.track_number,
          groupNameJa: trackGroup?.name_ja ?? "",
          label: isSongLabel(track.label ?? "") ? (track.label as SongLabel) : null,
          generation: track.generation,
          hasMv: hasMv(track.orbit_track_mvs),
          hasDancePracticeVideo: hasTrackVideoType(
            track.orbit_track_videos,
            "dance_practice"
          ),
          hasCallVideo: hasTrackVideoType(track.orbit_track_videos, "call"),
        };
      })
      .filter((item): item is ReleaseTrack => Boolean(item))
      .sort((a, b) => a.trackNumber - b.trackNumber),
  };
}

export function mapToReleaseListItem(row: ReleaseListRow): ReleaseListItem {
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

export function mapToReleaseOption(row: ReleaseOptionRow): ReleaseOption {
  const participants = (row.orbit_release_members ?? []).map((member) => {
    const orbitMember = Array.isArray(member.orbit_members)
      ? member.orbit_members[0]
      : member.orbit_members;
    // リリースのグループでの期を採用（無ければ null）
    const membership = (orbitMember?.orbit_member_groups ?? []).find(
      (mg) => mg.group_id === row.group_id
    );

    return {
      memberId: member.member_id,
      memberNameJa: orbitMember?.name_ja ?? "",
      memberNameKana: orbitMember?.name_kana ?? "",
      generation: membership?.generation ?? null,
    };
  });

  return {
    id: row.id,
    title: row.title,
    releaseType: row.release_type,
    participantMemberIds: participants.map((member) => member.memberId),
    participantMemberNames: participants.map((member) => member.memberNameJa),
    participantMemberKanas: participants.map((member) => member.memberNameKana),
    participantMemberGenerations: participants.map((member) => member.generation),
  };
}

export function toTrackLinkRpcInput(
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

// overlay（福神・休業中）の保存入力。いずれかが立つメンバーのみ送る。
export function toMemberPositionRpcInput(
  positions: CreateReleaseInput["memberPositions"]
): Array<{
  memberId: string;
  isFrontSpecial: boolean;
  isHiatus: boolean;
}> {
  return positions
    .filter((position) => position.isFrontSpecial || position.isHiatus)
    .map((position) => ({
      memberId: position.memberId,
      isFrontSpecial: position.isFrontSpecial,
      isHiatus: position.isHiatus,
    }));
}

export function toNumbering(
  releaseType: CreateReleaseInput["releaseType"],
  numbering: string
): number | null {
  if (releaseType !== "single" && releaseType !== "album") {
    return null;
  }

  return Number(numbering);
}

export function toBonusVideoRpcInput(
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
