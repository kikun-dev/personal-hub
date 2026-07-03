import type { SelectRows } from "@personal-hub/supabase";
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

// SelectRows は select 定数の typeof を必要とするため、リポジトリ側の SELECT 定数を
// ここへ移動し、行型と一緒に export する（リポジトリは本ファイルから import する片方向依存）。
export const RELEASE_LIST_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  artwork_path,
  orbit_people(display_name),
  orbit_groups(name_ja, color),
  orbit_release_members(member_id, orbit_members(name_ja, name_kana, orbit_member_groups(group_id, generation))),
  orbit_release_tracks(track_number)
` as const;

export const RELEASE_DETAIL_SELECT = `
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
  orbit_release_members(member_id, orbit_members(name_ja, name_kana, orbit_member_groups(group_id, generation))),
  orbit_release_member_positions(member_id, is_front_special, is_hiatus),
  orbit_release_tracks(
    track_number,
    orbit_tracks(
      id,
      title,
      label,
      generation,
      orbit_groups(name_ja, color),
      orbit_track_mvs(id),
      orbit_track_videos(video_type)
    )
  )
` as const;

export const RELEASE_PUBLIC_LIST_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  orbit_groups(name_ja, color),
  orbit_release_tracks(track_number)
` as const;

export const RELEASE_OPTION_SELECT = `
  id,
  title,
  release_type,
  group_id,
  orbit_release_members(member_id, orbit_members(name_ja, name_kana, orbit_member_groups(group_id, generation)))
` as const;

type ReleaseDetailRow = SelectRows<"orbit_releases", typeof RELEASE_DETAIL_SELECT>[number];

// findAll は RELEASE_LIST_SELECT（bonus_videos / member_positions 無し、release_tracks は
// track_number のみ）、findById は RELEASE_DETAIL_SELECT（全リレーションあり）の行を同じ
// mapToRelease に渡すため、詳細側にのみ存在する関連をオプショナルにして両方の select 結果を
// 受け付けられるようにする（memberRepository の MemberRow と同じ方針）。
// release_tracks[].orbit_tracks も LIST 側には無いため、要素単位で optional にする。
export type ReleaseRow = Omit<
  ReleaseDetailRow,
  "orbit_release_bonus_videos" | "orbit_release_member_positions" | "orbit_release_tracks"
> & {
  orbit_release_bonus_videos?: ReleaseDetailRow["orbit_release_bonus_videos"];
  orbit_release_member_positions?: ReleaseDetailRow["orbit_release_member_positions"];
  orbit_release_tracks?: Array<
    Omit<ReleaseDetailRow["orbit_release_tracks"][number], "orbit_tracks"> & {
      orbit_tracks?: ReleaseDetailRow["orbit_release_tracks"][number]["orbit_tracks"];
    }
  >;
};

export type ReleaseListRow = SelectRows<
  "orbit_releases",
  typeof RELEASE_PUBLIC_LIST_SELECT
>[number];

export type ReleaseOptionRow = SelectRows<
  "orbit_releases",
  typeof RELEASE_OPTION_SELECT
>[number];

type ReleaseDetailTrackRow = NonNullable<
  ReleaseDetailRow["orbit_release_tracks"][number]["orbit_tracks"]
>;

function hasTrackVideoType(
  videos: ReleaseDetailTrackRow["orbit_track_videos"],
  type: "dance_practice" | "call"
): boolean {
  return (videos ?? []).some(
    (video) => isSongVideoType(video.video_type) && video.video_type === type
  );
}

// release_type は DB 上 string 列（CHECK 制約で許容値を保証）。ReleaseType は null を
// 持たないドメイン型のため、実行時ガード（isReleaseType）を導入するとフォールバック分岐が
// 新たに必要になりロジックが変わってしまう。移行前も無条件 cast だったため、同じ挙動を
// 保つ cast として残す。
export function mapToRelease(row: ReleaseRow): Release {
  const artworkPerson = row.orbit_people;
  const group = row.orbit_groups;

  const participants = (row.orbit_release_members ?? [])
    .map((member) => {
      const orbitMember = member.orbit_members;
      // リリースのグループでの期を採用（無ければ null）
      const membership = (orbitMember.orbit_member_groups ?? []).find(
        (mg) => mg.group_id === row.group_id
      );
      return {
        memberId: member.member_id,
        memberNameJa: orbitMember.name_ja,
        memberNameKana: orbitMember.name_kana,
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
    groupNameJa: group.name_ja,
    groupColor: group.color,
    releaseType: row.release_type as ReleaseType,
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
        const track = item.orbit_tracks;
        if (!track) return null;
        const trackGroup = track.orbit_groups;
        return {
          trackId: track.id,
          trackTitle: track.title,
          trackNumber: item.track_number,
          groupNameJa: trackGroup.name_ja,
          label: isSongLabel(track.label ?? "") ? (track.label as SongLabel) : null,
          generation: track.generation,
          hasMv: Boolean(track.orbit_track_mvs),
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
  const group = row.orbit_groups;

  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    groupNameJa: group.name_ja,
    groupColor: group.color,
    releaseType: row.release_type as ReleaseType,
    numbering: row.numbering,
    releaseDate: row.release_date,
    trackCount: row.orbit_release_tracks.length,
  };
}

export function mapToReleaseOption(row: ReleaseOptionRow): ReleaseOption {
  const participants = row.orbit_release_members.map((member) => {
    const orbitMember = member.orbit_members;
    // リリースのグループでの期を採用（無ければ null）
    const membership = (orbitMember.orbit_member_groups ?? []).find(
      (mg) => mg.group_id === row.group_id
    );

    return {
      memberId: member.member_id,
      memberNameJa: orbitMember.name_ja,
      memberNameKana: orbitMember.name_kana,
      generation: membership?.generation ?? null,
    };
  });

  return {
    id: row.id,
    title: row.title,
    releaseType: row.release_type as ReleaseType,
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
