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
  SongReleaseLink,
  CreateSongInput,
} from "@/types/song";
import type { SongRepository } from "@/types/repositories";
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
      group_id: string;
      release_date: string | null;
      orbit_groups: ReleaseGroupRel;
    }
  | Array<{
      id: string;
      title: string;
      release_type: SongReleaseLink["releaseType"];
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
  duration_seconds: number | null;
  orbit_release_tracks?: TrackReleaseRow[];
  orbit_track_credits?: TrackCreditRow[];
  orbit_track_formations?: FormationRel;
  orbit_track_mvs?: MvRow[];
  orbit_track_costumes?: CostumeRow[];
};

const SONG_LIST_SELECT = `
  id,
  title,
  group_id,
  orbit_groups(name_ja, color),
  duration_seconds,
  orbit_release_tracks(
    release_id,
    track_number,
    orbit_releases(
      id,
      title,
      release_type,
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
  duration_seconds,
  orbit_release_tracks(
    release_id,
    track_number,
    orbit_releases(
      id,
      title,
      release_type,
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
  orbit_track_costumes(
    id,
    image_path,
    note,
    sort_order,
    orbit_people(display_name)
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

function mapRelease(row: TrackReleaseRow): SongReleaseLink | null {
  const release = pickFirst(row.orbit_releases);
  if (!release) return null;

  const group = pickFirst(release.orbit_groups);

  return {
    releaseId: release.id,
    releaseTitle: release.title,
    releaseType: release.release_type,
    groupId: release.group_id,
    groupNameJa: group?.name_ja ?? "",
    groupColor: group?.color ?? "#6B7280",
    releaseDate: release.release_date,
    trackNumber: row.track_number,
  };
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
      if (a.role !== b.role) return a.role.localeCompare(b.role);
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

function mapMv(rows: MvRow[] | undefined): SongMv | null {
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  const director = pickFirst(row.orbit_people);

  return {
    url: row.mv_url,
    directorName: director?.display_name ?? null,
    location: row.location,
    publishedOn: row.published_on,
    memo: row.memo,
  };
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
  const releases = (row.orbit_release_tracks ?? [])
    .map(mapRelease)
    .filter((release): release is SongReleaseLink => Boolean(release))
    .sort((a, b) => {
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

  const dates = releases
    .map((release) => release.releaseDate)
    .filter((releaseDate): releaseDate is string => Boolean(releaseDate));

  const releaseDate = dates.length > 0
    ? [...dates].sort((a, b) => a.localeCompare(b))[0]
    : null;

  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    groupNameJa: songGroup?.name_ja ?? "",
    groupColor: songGroup?.color ?? "#6B7280",
    durationSeconds: row.duration_seconds,
    releaseDate,
    releases,
    credits: mapCredits(row.orbit_track_credits),
    formationRows: mapFormation(row.orbit_track_formations),
    mv: mapMv(row.orbit_track_mvs),
    costumes: mapCostumes(row.orbit_track_costumes),
  };
}

function parseDurationSeconds(value: string): number | null {
  if (!value) return null;
  return Number(value);
}

function parseReleaseLinks(input: CreateSongInput["releaseLinks"]): Array<{
  releaseId: string;
  trackNumber: number;
}> {
  return input.map((link) => ({
    releaseId: link.releaseId,
    trackNumber: Number(link.trackNumber),
  }));
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
      const durationSeconds = parseDurationSeconds(input.durationSeconds);
      const releaseLinks = parseReleaseLinks(input.releaseLinks);
      const credits = parseCredits(input);
      const formationRows = parseFormationRows(input.formationRows);
      const mv = parseMv(input.mv);
      const costumes = parseCostumes(input.costumes);

      const { data: trackId, error: rpcError } = await supabase.rpc("create_track_with_relations_v2", {
        p_title: input.title.trim(),
        p_group_id: input.groupId,
        p_duration_seconds: durationSeconds,
        p_release_links: releaseLinks,
        p_credits: credits,
        p_formation_rows: formationRows,
        p_mv: mv,
        p_costumes: costumes,
      });

      if (rpcError) {
        throw new RepositoryError("楽曲の作成に失敗しました", rpcError);
      }

      if (typeof trackId !== "string") {
        throw new RepositoryError("作成した楽曲IDの取得に失敗しました", null);
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

      const durationSeconds = parseDurationSeconds(input.durationSeconds);
      const releaseLinks = parseReleaseLinks(input.releaseLinks);
      const credits = parseCredits(input);
      const formationRows = parseFormationRows(input.formationRows);
      const mv = parseMv(input.mv);
      const costumes = parseCostumes(input.costumes);

      const { error: rpcError } = await supabase.rpc("update_track_with_relations_v2", {
        p_track_id: id,
        p_title: input.title.trim(),
        p_group_id: input.groupId,
        p_duration_seconds: durationSeconds,
        p_release_links: releaseLinks,
        p_credits: credits,
        p_formation_rows: formationRows,
        p_mv: mv,
        p_costumes: costumes,
      });

      if (rpcError) {
        throw new RepositoryError("楽曲の更新に失敗しました", rpcError);
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

      if (formationRowIds.length === 0) {
        return [];
      }

      const { data: formationRows, error: formationRowsError } = await supabase
        .from("orbit_track_formation_rows")
        .select("formation_id")
        .in("id", formationRowIds);

      if (formationRowsError) {
        throw new RepositoryError("参加楽曲の取得に失敗しました", formationRowsError);
      }

      const formationIds = uniqueStrings(
        ((formationRows as Array<{ formation_id: string }>) ?? []).map((row) => row.formation_id)
      );

      if (formationIds.length === 0) {
        return [];
      }

      const { data: formations, error: formationsError } = await supabase
        .from("orbit_track_formations")
        .select("track_id")
        .in("id", formationIds);

      if (formationsError) {
        throw new RepositoryError("参加楽曲の取得に失敗しました", formationsError);
      }

      const trackIds = uniqueStrings(
        ((formations as Array<{ track_id: string }>) ?? []).map((row) => row.track_id)
      );

      return findManyByIds(trackIds, SONG_LIST_SELECT);
    },
  };
}
