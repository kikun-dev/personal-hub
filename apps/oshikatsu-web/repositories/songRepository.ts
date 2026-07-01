import type { SupabaseClient } from "@personal-hub/supabase";
import type {
  Song,
  SongOption,
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
  CalendarVideoItem,
} from "@/types/song";
import { SONG_VIDEO_TYPES, isSongLabel, isSongVideoType } from "@/types/song";
import type { SongRepository } from "@/types/repositories";
import type { ReleaseType } from "@/types/release";
import { RepositoryError } from "@/types/errors";
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

type SongRow = {
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

type SongListRow = {
  id: string;
  title: string;
  group_id: string;
  orbit_groups: SongGroupRel;
  label: string | null;
  generation: string | null;
  orbit_release_tracks?: SongListReleaseRow[];
};

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

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  return value;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
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

function mapSong(row: SongRow): Song {
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

function mapToSongListItem(row: SongListRow): SongListItem {
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
function parseLabel(value: string): string | null {
  return isSongLabel(value) ? value : null;
}

function parseGeneration(label: string, generation: string): string | null {
  if (label !== "generation") return null;
  const trimmed = generation.trim();
  return trimmed === "" ? null : trimmed;
}

function parseReleaseLinks(input: CreateSongInput["releaseLinks"]): Array<{
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

// 曲順が空欄(null)の紐づけを、そのリリース内の末尾（max + 1）に解決する
async function resolveReleaseLinkTrackNumbers(
  supabase: SupabaseClient,
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

function parseCredits(input: CreateSongInput): Array<{
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

function parseFormationRows(input: CreateSongInput["formationRows"]): Array<{
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

function parseMv(input: CreateSongInput["mv"]): {
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

function parseVideos(input: CreateSongInput["videos"]): Array<{
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

function parseCostumes(input: CreateSongInput["costumes"]): Array<{
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

export function createSongRepository(
  supabase: SupabaseClient
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

      const { data: trackId, error: rpcError } = await supabase.rpc("create_track_with_relations_v2", {
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

      const { error: centerError } = await supabase.rpc("set_track_centers", {
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

      const { error: rpcError } = await supabase.rpc("update_track_with_relations_v2", {
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

      const { error: centerError } = await supabase.rpc("set_track_centers", {
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
      const { error } = await supabase
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
        .select("published_on, orbit_tracks(id, title, orbit_groups(name_ja))")
        .not("published_on", "is", null);
      if (mvError) {
        throw new RepositoryError("カレンダー用MVの取得に失敗しました", mvError);
      }

      // 関連動画の配信日
      const { data: videoData, error: videoError } = await supabase
        .from("orbit_track_videos")
        .select(
          "video_type, published_on, orbit_tracks(id, title, orbit_groups(name_ja))"
        )
        .not("published_on", "is", null);
      if (videoError) {
        throw new RepositoryError("カレンダー用動画の取得に失敗しました", videoError);
      }

      const items: CalendarVideoItem[] = [];
      for (const row of (mvData as
        | Array<{ published_on: string; orbit_tracks: TrackRel | TrackRel[] | null }>
        | null) ?? []) {
        const track = pickTrack(row.orbit_tracks);
        if (!track) continue;
        items.push({
          trackId: track.id,
          trackTitle: track.title,
          groupNameJa: groupNameOf(track),
          videoType: "mv",
          date: row.published_on,
        });
      }
      for (const row of (videoData as
        | Array<{
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
          date: row.published_on,
        });
      }
      return items;
    },
  };
}
