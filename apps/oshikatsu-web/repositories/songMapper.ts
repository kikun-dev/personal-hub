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

type ReleaseGroupRel =
  | {
      name_ja: string;
      color: string;
    }
  | Array<{
      name_ja: string;
      color: string;
    }>;

type SongGroupRel =
  | {
      name_ja: string;
      color: string;
    }
  | Array<{
      name_ja: string;
      color: string;
    }>;

type ReleaseRel =
  | {
      id: string;
      title: string;
      release_type: SongReleaseLink["releaseType"];
      numbering: number | null;
      group_id: string;
      release_date: string | null;
      orbit_groups: ReleaseGroupRel;
    }
  | Array<{
      id: string;
      title: string;
      release_type: SongReleaseLink["releaseType"];
      numbering: number | null;
      group_id: string;
      release_date: string | null;
      orbit_groups: ReleaseGroupRel;
    }>;

type TrackReleaseRow = {
  release_id: string;
  track_number: number;
  orbit_releases: ReleaseRel;
};

type PersonRel =
  | {
      id?: string;
      display_name: string;
    }
  | Array<{
      id?: string;
      display_name: string;
    }>;

type TrackCreditRow = {
  credit_role: SongCreditRole;
  sort_order: number;
  orbit_people: PersonRel;
};

type FormationMemberRow = {
  member_id: string;
  slot_order: number;
  is_center: boolean;
  orbit_members:
    | {
        name_ja: string;
      }
    | Array<{
        name_ja: string;
      }>;
};

type FormationRowRow = {
  id: string;
  row_number: number;
  member_count: number;
  orbit_track_formation_members?: FormationMemberRow[];
};

type FormationRel =
  | {
      id: string;
      column_count: number;
      orbit_track_formation_rows?: FormationRowRow[];
    }
  | Array<{
      id: string;
      column_count: number;
      orbit_track_formation_rows?: FormationRowRow[];
    }>;

type MvRow = {
  mv_url: string;
  location: string | null;
  published_on: string | null;
  memo: string | null;
  orbit_people: PersonRel | null;
};

// orbit_track_mvs は track_id が UNIQUE のため to-one として
// 単一オブジェクト（リレーションが無ければ null）で返る。配列で返る場合にも備える。
type MvRel = MvRow | MvRow[] | null;

type VideoRow = {
  video_type: string;
  video_url: string;
  published_on: string | null;
  memo: string | null;
};

type CostumeRow = {
  id: string;
  image_path: string;
  note: string | null;
  sort_order: number;
  orbit_people: PersonRel;
};

export type SongRow = {
  id: string;
  title: string;
  group_id: string;
  orbit_groups: SongGroupRel;
  label: string | null;
  generation: string | null;
  orbit_release_tracks?: TrackReleaseRow[];
  orbit_track_credits?: TrackCreditRow[];
  orbit_track_formations?: FormationRel;
  orbit_track_mvs?: MvRel;
  orbit_track_videos?: VideoRow[];
  orbit_track_costumes?: CostumeRow[];
};

type SongListReleaseDateRel =
  | {
      release_date: string | null;
      release_type: ReleaseType;
      numbering: number | null;
    }
  | Array<{
      release_date: string | null;
      release_type: ReleaseType;
      numbering: number | null;
    }>
  | null;

type SongListReleaseRow = {
  release_id: string;
  track_number: number;
  orbit_releases: SongListReleaseDateRel;
};

type RepresentativeReleaseCandidate = {
  releaseId: string;
  trackNumber: number;
  releaseDate: string | null;
  releaseType: ReleaseType | null;
  numbering: number | null;
};

export type SongListRow = {
  id: string;
  title: string;
  group_id: string;
  orbit_groups: SongGroupRel;
  label: string | null;
  generation: string | null;
  orbit_release_tracks?: SongListReleaseRow[];
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  return value;
}

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

function mapRelease(row: TrackReleaseRow): SongReleaseLink | null {
  const release = pickFirst(row.orbit_releases);
  if (!release) return null;

  const group = pickFirst(release.orbit_groups);

  return {
    releaseId: release.id,
    releaseTitle: release.title,
    releaseType: release.release_type,
    numbering: release.numbering,
    groupId: release.group_id,
    groupNameJa: group?.name_ja ?? "",
    groupColor: group?.color ?? "#6B7280",
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

function mapCredits(rows: TrackCreditRow[] | undefined): SongCredit[] {
  if (!rows) return [];

  return rows
    .map((row) => {
      const person = pickFirst(row.orbit_people);
      if (!person) return null;

      return {
        role: row.credit_role,
        personName: person.display_name,
        sortOrder: row.sort_order,
      } satisfies SongCredit;
    })
    .filter((credit): credit is SongCredit => Boolean(credit))
    .sort((a, b) => {
      if (a.role !== b.role) return creditRoleRank(a.role) - creditRoleRank(b.role);
      return a.sortOrder - b.sortOrder;
    });
}

function mapFormation(formationRel: FormationRel | undefined): SongFormationRow[] {
  const formation = pickFirst(formationRel);
  if (!formation) return [];

  return (formation.orbit_track_formation_rows ?? [])
    .map((row) => {
      const members: SongFormationMember[] = (row.orbit_track_formation_members ?? [])
        .map((member) => {
          const orbitMember = pickFirst(member.orbit_members);
          return {
            memberId: member.member_id,
            memberNameJa: orbitMember?.name_ja ?? "",
            slotOrder: member.slot_order,
            isCenter: member.is_center ?? false,
          };
        })
        .sort((a, b) => a.slotOrder - b.slotOrder);

      return {
        rowNumber: row.row_number,
        memberCount: row.member_count,
        members,
      } satisfies SongFormationRow;
    })
    .sort((a, b) => a.rowNumber - b.rowNumber);
}

function mapMv(mvRel: MvRel | undefined): SongMv | null {
  const row = pickFirst(mvRel);
  if (!row) return null;
  const director = pickFirst(row.orbit_people);

  return {
    url: row.mv_url,
    directorName: director?.display_name ?? null,
    location: row.location,
    publishedOn: row.published_on,
    memo: row.memo,
  };
}

function videoTypeRank(type: SongVideoType): number {
  const index = SONG_VIDEO_TYPES.indexOf(type);
  return index === -1 ? SONG_VIDEO_TYPES.length : index;
}

function mapVideos(rows: VideoRow[] | undefined): SongVideo[] {
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

function mapCostumes(rows: CostumeRow[] | undefined): SongCostume[] {
  if (!rows) return [];

  return rows
    .map((row) => {
      const person = pickFirst(row.orbit_people);
      return {
        id: row.id,
        stylistName: person?.display_name ?? "",
        imagePath: row.image_path,
        note: row.note,
        sortOrder: row.sort_order,
      } satisfies SongCostume;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapSong(row: SongRow): Song {
  const songGroup = pickFirst(row.orbit_groups);
  const mappedReleases = (row.orbit_release_tracks ?? [])
    .map(mapRelease)
    .filter((release): release is SongReleaseLink => Boolean(release));

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
    groupNameJa: songGroup?.name_ja ?? "",
    groupColor: songGroup?.color ?? "#6B7280",
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
  };
}

export function mapToSongListItem(row: SongListRow): SongListItem {
  const group = pickFirst(row.orbit_groups);
  const releaseTracks = row.orbit_release_tracks ?? [];

  // 全紐づけ（種別・ナンバリング含む）。
  const allLinks = releaseTracks.map((releaseTrack) => {
    const release = pickFirst(releaseTrack.orbit_releases);
    return {
      releaseId: releaseTrack.release_id,
      trackNumber: releaseTrack.track_number,
      releaseDate: release?.release_date ?? null,
      releaseType: release?.release_type ?? null,
      numbering: release?.numbering ?? null,
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
    groupNameJa: group?.name_ja ?? "",
    groupColor: group?.color ?? "#6B7280",
    label: isSongLabel(row.label ?? "") ? (row.label as SongLabel) : null,
    generation: row.generation,
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
