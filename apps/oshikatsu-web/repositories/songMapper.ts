import type { SelectRows } from "@personal-hub/supabase";
import type {
  Song,
  SongCredit,
  SongCreditRole,
  SongCostume,
  SongFormationMember,
  SongFormationRow,
  SongMv,
  SongVideo,
  SongVideoType,
  SongReleaseLink,
  CreateSongInput,
  SongListItem,
  SongLabel,
} from "@/types/song";
import { SONG_VIDEO_TYPES, isSongLabel, isSongVideoType } from "@/types/song";
import type { ReleaseType } from "@/types/release";
import { splitCreditNames } from "@/lib/songCredits";

// SelectRows は select 定数の typeof を必要とするため、リポジトリ側の SELECT 定数を
// ここへ移動し、行型と一緒に export する（リポジトリは本ファイルから import する片方向依存）。
export const SONG_LIST_SELECT = `
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
` as const;

export const SONG_DETAIL_SELECT = `
  id,
  title,
  group_id,
  orbit_groups(name_ja, color),
  label,
  generation,
  artist_name,
  note,
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
` as const;

export const SONG_PUBLIC_LIST_SELECT = `
  id,
  title,
  group_id,
  orbit_groups(name_ja, color, is_catchall),
  label,
  generation,
  orbit_release_tracks(
    release_id,
    track_number,
    orbit_releases(release_date, release_type, numbering)
  )
` as const;

type SongDetailRow = SelectRows<"orbit_tracks", typeof SONG_DETAIL_SELECT>[number];

// findAll は SONG_LIST_SELECT（詳細リレーション無し）、findById/create/update は
// SONG_DETAIL_SELECT（詳細リレーションあり）の行を同じ mapSong に渡すため、詳細側にのみ
// 存在する関連をオプショナルにして両方の select 結果を受け付けられるようにする
// （memberRepository の MemberRow と同じ方針）。
export type SongRow = Omit<
  SongDetailRow,
  | "orbit_track_credits"
  | "orbit_track_formations"
  | "orbit_track_mvs"
  | "orbit_track_videos"
  | "orbit_track_costumes"
  | "artist_name"
  | "note"
> & {
  orbit_track_credits?: SongDetailRow["orbit_track_credits"];
  orbit_track_formations?: SongDetailRow["orbit_track_formations"];
  orbit_track_mvs?: SongDetailRow["orbit_track_mvs"];
  orbit_track_videos?: SongDetailRow["orbit_track_videos"];
  orbit_track_costumes?: SongDetailRow["orbit_track_costumes"];
  // artist_name / note は SONG_LIST_SELECT（admin一覧用、詳細リレーション無し）には
  // 含まれないため、他の詳細専用リレーションと同じくオプショナルにして両方の select
  // 結果を受け付けられるようにする。
  artist_name?: SongDetailRow["artist_name"];
  note?: SongDetailRow["note"];
};

export type SongListRow = SelectRows<"orbit_tracks", typeof SONG_PUBLIC_LIST_SELECT>[number];

type SongTrackReleaseRow = SongRow["orbit_release_tracks"][number];
type SongListTrackReleaseRow = SongListRow["orbit_release_tracks"][number];

type RepresentativeReleaseCandidate = {
  releaseId: string;
  trackNumber: number;
  releaseDate: string | null;
  releaseType: ReleaseType | null;
  numbering: number | null;
};

function pickFirstDatedRelease<T extends RepresentativeReleaseCandidate>(
  links: T[]
): T | null {
  const datedLinks = links
    .filter((link) => Boolean(link.releaseDate))
    .sort((a, b) => {
      const dateCompare = (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "");
      return dateCompare !== 0 ? dateCompare : a.releaseId.localeCompare(b.releaseId);
    });

  return datedLinks[0] ?? null;
}

function pickRepresentativeReleaseLabelSource<T extends RepresentativeReleaseCandidate>(
  links: T[]
): T | null {
  return pickFirstDatedRelease(links) ?? links[0] ?? null;
}

// release_type は DB 上 string 列（CHECK 制約で許容値を保証）。ReleaseType は null を
// 持たないドメイン型のため、実行時ガード（isReleaseType）を導入するとフォールバック
// 分岐が新たに必要になりロジックが変わってしまう。移行前も無条件 cast だったため、
// 同じ挙動を保つ cast として残す（本関数内で2箇所）。
function mapRelease(row: SongTrackReleaseRow): SongReleaseLink {
  const release = row.orbit_releases;
  const group = release.orbit_groups;

  return {
    releaseId: release.id,
    releaseTitle: release.title,
    releaseType: release.release_type as ReleaseType,
    numbering: release.numbering,
    groupId: release.group_id,
    groupNameJa: group.name_ja,
    groupColor: group.color,
    releaseDate: release.release_date,
    trackNumber: row.track_number,
  };
}

// クレジットの表示順（作詞→作曲→編曲→振付）。未知ロールは末尾へ回す。
const CREDIT_ROLE_ORDER: SongCreditRole[] = [
  "lyrics",
  "music",
  "arrangement",
  "choreography",
];

function creditRoleRank(role: SongCreditRole): number {
  const index = CREDIT_ROLE_ORDER.indexOf(role);
  return index === -1 ? CREDIT_ROLE_ORDER.length : index;
}

function mapCredits(rows: SongRow["orbit_track_credits"]): SongCredit[] {
  if (!rows) return [];

  return rows
    .map(
      (row) =>
        ({
          // credit_role は DB 上 string 列。実行時ガード関数が無いため、移行前と同じ
          // 無条件 cast として残す。
          role: row.credit_role as SongCreditRole,
          personName: row.orbit_people.display_name,
          sortOrder: row.sort_order,
        }) satisfies SongCredit
    )
    .sort((a, b) => {
      if (a.role !== b.role) return creditRoleRank(a.role) - creditRoleRank(b.role);
      return a.sortOrder - b.sortOrder;
    });
}

function mapFormation(formation: SongRow["orbit_track_formations"]): SongFormationRow[] {
  if (!formation) return [];

  return formation.orbit_track_formation_rows
    .map((row) => {
      const members: SongFormationMember[] = row.orbit_track_formation_members
        .map((member) => ({
          memberId: member.member_id,
          memberNameJa: member.orbit_members.name_ja,
          slotOrder: member.slot_order,
          isCenter: member.is_center,
        }))
        .sort((a, b) => a.slotOrder - b.slotOrder);

      return {
        rowNumber: row.row_number,
        memberCount: row.member_count,
        members,
      } satisfies SongFormationRow;
    })
    .sort((a, b) => a.rowNumber - b.rowNumber);
}

function mapMv(mv: SongRow["orbit_track_mvs"]): SongMv | null {
  if (!mv) return null;

  return {
    url: mv.mv_url,
    directorName: mv.orbit_people?.display_name ?? null,
    location: mv.location,
    publishedOn: mv.published_on,
    memo: mv.memo,
  };
}

function videoTypeRank(type: SongVideoType): number {
  const index = SONG_VIDEO_TYPES.indexOf(type);
  return index === -1 ? SONG_VIDEO_TYPES.length : index;
}

function mapVideos(rows: SongRow["orbit_track_videos"]): SongVideo[] {
  if (!rows) return [];

  return rows
    .map((row) => {
      if (!isSongVideoType(row.video_type)) return null;
      return {
        type: row.video_type,
        url: row.video_url,
        publishedOn: row.published_on,
        memo: row.memo,
      } satisfies SongVideo;
    })
    .filter((video): video is SongVideo => Boolean(video))
    .sort((a, b) => videoTypeRank(a.type) - videoTypeRank(b.type));
}

function mapCostumes(rows: SongRow["orbit_track_costumes"]): SongCostume[] {
  if (!rows) return [];

  return rows
    .map((row) => ({
      id: row.id,
      stylistName: row.orbit_people.display_name,
      imagePath: row.image_path,
      note: row.note,
      sortOrder: row.sort_order,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapSong(row: SongRow): Song {
  const songGroup = row.orbit_groups;
  const mappedReleases = row.orbit_release_tracks.map(mapRelease);

  const representative = pickFirstDatedRelease(mappedReleases);
  const labelRepresentative = pickRepresentativeReleaseLabelSource(mappedReleases);

  const releases = [...mappedReleases].sort((a, b) => {
    if (a.releaseDate && b.releaseDate) {
      if (a.releaseDate !== b.releaseDate) {
        return a.releaseDate.localeCompare(b.releaseDate);
      }
    } else if (a.releaseDate) {
      return -1;
    } else if (b.releaseDate) {
      return 1;
    }

    return a.trackNumber - b.trackNumber;
  });

  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    groupNameJa: songGroup.name_ja,
    groupColor: songGroup.color,
    label: isSongLabel(row.label ?? "") ? (row.label as SongLabel) : null,
    generation: row.generation,
    releaseDate: representative?.releaseDate ?? null,
    representativeReleaseType: labelRepresentative?.releaseType ?? null,
    representativeNumbering: labelRepresentative?.numbering ?? null,
    releases,
    credits: mapCredits(row.orbit_track_credits),
    formationRows: mapFormation(row.orbit_track_formations),
    mv: mapMv(row.orbit_track_mvs),
    videos: mapVideos(row.orbit_track_videos),
    costumes: mapCostumes(row.orbit_track_costumes),
    artistName: row.artist_name ?? null,
    note: row.note ?? null,
  };
}

export function mapToSongListItem(row: SongListRow): SongListItem {
  const group = row.orbit_groups;
  const releaseTracks = row.orbit_release_tracks;

  // 全紐づけ（種別・ナンバリング含む）。
  const allLinks = releaseTracks.map((releaseTrack: SongListTrackReleaseRow) => {
    const release = releaseTrack.orbit_releases;
    return {
      releaseId: releaseTrack.release_id,
      trackNumber: releaseTrack.track_number,
      releaseDate: release.release_date,
      releaseType: release.release_type as ReleaseType,
      numbering: release.numbering,
    };
  });

  // 代表リリース = 初出（最古の非nullリリース日）。日付が並んだら release_id で決定的に。
  const representative = pickFirstDatedRelease(allLinks);
  // 表示用代表 = 初出リリース（無ければ任意の紐づけ）。一覧の種別表記に使う。
  const labelRepresentative = pickRepresentativeReleaseLabelSource(allLinks);

  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    groupNameJa: group.name_ja,
    groupColor: group.color,
    label: isSongLabel(row.label ?? "") ? (row.label as SongLabel) : null,
    generation: row.generation,
    isCatchall: group.is_catchall,
    releaseCount: releaseTracks.length,
    firstReleaseDate: representative?.releaseDate ?? null,
    representativeReleaseId: representative?.releaseId ?? null,
    representativeTrackNumber: representative?.trackNumber ?? null,
    representativeReleaseType: labelRepresentative?.releaseType ?? null,
    representativeNumbering: labelRepresentative?.numbering ?? null,
  };
}

// label は許容値のみ、generation は期別のときだけ保持する
export function parseLabel(value: string): string | null {
  return isSongLabel(value) ? value : null;
}

export function parseGeneration(label: string, generation: string): string | null {
  if (label !== "generation") return null;
  const trimmed = generation.trim();
  return trimmed === "" ? null : trimmed;
}

export function parseReleaseLinks(input: CreateSongInput["releaseLinks"]): Array<{
  releaseId: string;
  trackNumber: number | null;
}> {
  return input.map((link) => {
    const raw = link.trackNumber.trim();
    return {
      releaseId: link.releaseId,
      // 空欄は末尾自動採番のため null（保存時に解決する）
      trackNumber: raw === "" ? null : Number(raw),
    };
  });
}

export function parseCredits(input: CreateSongInput): Array<{
  role: SongCreditRole;
  personName: string;
  sortOrder: number;
}> {
  const sources: Array<{ role: SongCreditRole; raw: string }> = [
    { role: "lyrics", raw: input.lyricsPeople },
    { role: "music", raw: input.musicPeople },
    { role: "arrangement", raw: input.arrangementPeople },
    { role: "choreography", raw: input.choreographyPeople },
  ];

  return sources.flatMap(({ role, raw }) =>
    splitCreditNames(raw).map((personName, index) => ({
      role,
      personName,
      sortOrder: index,
    }))
  );
}

export function parseFormationRows(input: CreateSongInput["formationRows"]): Array<{
  rowNumber: number;
  memberCount: number;
  memberIds: string[];
}> {
  return input.map((row, index) => ({
    rowNumber: index + 1,
    memberCount: Number(row.memberCount),
    memberIds: row.memberIds,
  }));
}

export function parseMv(input: CreateSongInput["mv"]): {
  url: string;
  directorName: string;
  location: string;
  publishedOn: string;
  memo: string;
} | null {
  const url = input.url.trim();
  const directorName = input.directorName.trim();
  const location = input.location.trim();
  const publishedOn = input.publishedOn.trim();
  const memo = input.memo.trim();

  if (!url && !directorName && !location && !publishedOn && !memo) {
    return null;
  }

  return {
    url,
    directorName,
    location,
    publishedOn,
    memo,
  };
}

export function parseVideos(input: CreateSongInput["videos"]): Array<{
  type: SongVideoType;
  url: string;
  publishedOn: string;
  memo: string;
}> {
  return SONG_VIDEO_TYPES.flatMap((type) => {
    const video = input[type];
    const url = video.url.trim();
    if (!url) return [];

    return [{
      type,
      url,
      publishedOn: video.publishedOn.trim(),
      memo: video.memo.trim(),
    }];
  });
}

export function parseCostumes(input: CreateSongInput["costumes"]): Array<{
  stylistName: string;
  imagePath: string;
  note: string;
}> {
  return input.map((costume) => ({
    stylistName: costume.stylistName.trim(),
    imagePath: costume.imagePath.trim(),
    note: costume.note.trim(),
  }));
}
