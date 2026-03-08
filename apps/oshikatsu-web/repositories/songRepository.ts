import type { SupabaseClient } from "@personal-hub/supabase";
import type {
  Song,
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
  duration_seconds: number | null;
  orbit_release_tracks?: TrackReleaseRow[];
  orbit_track_credits?: TrackCreditRow[];
  orbit_track_formations?: FormationRel;
  orbit_track_mvs?: MvRow[];
  orbit_track_costumes?: CostumeRow[];
};

type PersonRow = {
  id: string;
  display_name: string;
};

type FormationIdRow = {
  id: string;
};

type FormationRowIdRow = {
  id: string;
  row_number: number;
};

type GroupTrackIdRow = {
  track_id: string;
};

const SONG_LIST_SELECT = `
  id,
  title,
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
    durationSeconds: row.duration_seconds,
    releaseDate,
    groupIds: uniqueStrings(releases.map((release) => release.groupId)),
    groupNames: uniqueStrings(
      releases
        .map((release) => release.groupNameJa)
        .filter(Boolean)
    ),
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
  async function ensurePeopleByNames(names: string[]): Promise<Map<string, string>> {
    const uniqueNames = uniqueStrings(
      names
        .map((name) => name.trim())
        .filter(Boolean)
    );

    if (uniqueNames.length === 0) {
      return new Map();
    }

    const { data: existing, error: existingError } = await supabase
      .from("orbit_people")
      .select("id, display_name")
      .in("display_name", uniqueNames);

    if (existingError) {
      throw new RepositoryError("人物マスタの取得に失敗しました", existingError);
    }

    const existingMap = new Map<string, string>(
      ((existing as PersonRow[]) ?? []).map((person) => [person.display_name, person.id])
    );

    const missing = uniqueNames.filter((name) => !existingMap.has(name));

    if (missing.length > 0) {
      const { error: insertError } = await supabase
        .from("orbit_people")
        .insert(missing.map((displayName) => ({ display_name: displayName })));

      if (insertError && insertError.code !== "23505") {
        throw new RepositoryError("人物マスタの登録に失敗しました", insertError);
      }

      const { data: allPeople, error: allPeopleError } = await supabase
        .from("orbit_people")
        .select("id, display_name")
        .in("display_name", uniqueNames);

      if (allPeopleError) {
        throw new RepositoryError("人物マスタの再取得に失敗しました", allPeopleError);
      }

      return new Map(
        ((allPeople as PersonRow[]) ?? []).map((person) => [person.display_name, person.id])
      );
    }

    return existingMap;
  }

  async function replaceReleaseLinks(
    songId: string,
    releaseLinks: Array<{ releaseId: string; trackNumber: number }>
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_release_tracks")
      .delete()
      .eq("track_id", songId);

    if (deleteError) {
      throw new RepositoryError("楽曲のリリース紐づけ更新に失敗しました", deleteError);
    }

    if (releaseLinks.length === 0) return;

    const { error: insertError } = await supabase
      .from("orbit_release_tracks")
      .insert(
        releaseLinks.map((link) => ({
          track_id: songId,
          release_id: link.releaseId,
          track_number: link.trackNumber,
        }))
      );

    if (insertError) {
      throw new RepositoryError("楽曲のリリース紐づけ登録に失敗しました", insertError);
    }
  }

  async function replaceCredits(
    songId: string,
    credits: Array<{ role: SongCreditRole; personName: string; sortOrder: number }>
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_track_credits")
      .delete()
      .eq("track_id", songId);

    if (deleteError) {
      throw new RepositoryError("楽曲クレジット更新に失敗しました", deleteError);
    }

    if (credits.length === 0) return;

    const peopleMap = await ensurePeopleByNames(credits.map((credit) => credit.personName));

    const inserts = credits
      .map((credit) => {
        const personId = peopleMap.get(credit.personName);
        if (!personId) return null;

        return {
          track_id: songId,
          credit_role: credit.role,
          person_id: personId,
          sort_order: credit.sortOrder,
        };
      })
      .filter((row): row is {
        track_id: string;
        credit_role: SongCreditRole;
        person_id: string;
        sort_order: number;
      } => Boolean(row));

    if (inserts.length === 0) return;

    const { error: insertError } = await supabase
      .from("orbit_track_credits")
      .insert(inserts);

    if (insertError) {
      throw new RepositoryError("楽曲クレジット登録に失敗しました", insertError);
    }
  }

  async function assertFormationMembersBelongToReleaseParticipants(
    releaseIds: string[],
    formationRows: Array<{ rowNumber: number; memberCount: number; memberIds: string[] }>
  ): Promise<void> {
    if (formationRows.length === 0) return;

    const assignedMemberIds = uniqueStrings(
      formationRows.flatMap((row) => row.memberIds)
    );

    if (assignedMemberIds.length === 0) return;

    const { data, error } = await supabase
      .from("orbit_release_members")
      .select("member_id")
      .in("release_id", releaseIds);

    if (error) {
      throw new RepositoryError("リリース参加メンバーの取得に失敗しました", error);
    }

    const allowedMemberIds = new Set(
      ((data as Array<{ member_id: string }>) ?? []).map((row) => row.member_id)
    );

    const invalidMemberIds = assignedMemberIds.filter((memberId) => !allowedMemberIds.has(memberId));

    if (invalidMemberIds.length > 0) {
      throw new RepositoryError(
        "フォーメーションにリリース参加外メンバーが含まれています",
        { invalidMemberIds }
      );
    }
  }

  async function replaceFormation(
    songId: string,
    releaseIds: string[],
    formationRows: Array<{ rowNumber: number; memberCount: number; memberIds: string[] }>
  ): Promise<void> {
    const { data: existingFormation, error: existingError } = await supabase
      .from("orbit_track_formations")
      .select("id")
      .eq("track_id", songId)
      .maybeSingle();

    if (existingError) {
      throw new RepositoryError("フォーメーション情報の取得に失敗しました", existingError);
    }

    const existingFormationId = (existingFormation as FormationIdRow | null)?.id ?? null;

    if (formationRows.length === 0) {
      if (!existingFormationId) return;

      const { error: deleteFormationError } = await supabase
        .from("orbit_track_formations")
        .delete()
        .eq("id", existingFormationId);

      if (deleteFormationError) {
        throw new RepositoryError("フォーメーション削除に失敗しました", deleteFormationError);
      }
      return;
    }

    await assertFormationMembersBelongToReleaseParticipants(releaseIds, formationRows);

    let formationId = existingFormationId;

    if (formationId) {
      const { error: updateFormationError } = await supabase
        .from("orbit_track_formations")
        .update({ column_count: formationRows.length })
        .eq("id", formationId);

      if (updateFormationError) {
        throw new RepositoryError("フォーメーション更新に失敗しました", updateFormationError);
      }

      const { error: deleteRowsError } = await supabase
        .from("orbit_track_formation_rows")
        .delete()
        .eq("formation_id", formationId);

      if (deleteRowsError) {
        throw new RepositoryError("フォーメーション列の更新に失敗しました", deleteRowsError);
      }
    } else {
      const { data: insertedFormation, error: insertFormationError } = await supabase
        .from("orbit_track_formations")
        .insert({
          track_id: songId,
          column_count: formationRows.length,
        })
        .select("id")
        .single();

      if (insertFormationError) {
        throw new RepositoryError("フォーメーション作成に失敗しました", insertFormationError);
      }

      formationId = (insertedFormation as FormationIdRow).id;
    }

    if (!formationId) {
      throw new RepositoryError("フォーメーションIDの解決に失敗しました", null);
    }

    const { data: insertedRows, error: insertRowsError } = await supabase
      .from("orbit_track_formation_rows")
      .insert(
        formationRows.map((row) => ({
          formation_id: formationId,
          row_number: row.rowNumber,
          member_count: row.memberCount,
        }))
      )
      .select("id, row_number");

    if (insertRowsError) {
      throw new RepositoryError("フォーメーション列登録に失敗しました", insertRowsError);
    }

    const rowIdByRowNumber = new Map<number, string>(
      ((insertedRows as FormationRowIdRow[]) ?? []).map((row) => [row.row_number, row.id])
    );

    const memberInserts = formationRows.flatMap((row) => {
      const formationRowId = rowIdByRowNumber.get(row.rowNumber);
      if (!formationRowId) return [];

      return row.memberIds.map((memberId, index) => ({
        formation_row_id: formationRowId,
        member_id: memberId,
        slot_order: index,
      }));
    });

    if (memberInserts.length === 0) return;

    const { error: insertMembersError } = await supabase
      .from("orbit_track_formation_members")
      .insert(memberInserts);

    if (insertMembersError) {
      throw new RepositoryError("フォーメーション割当登録に失敗しました", insertMembersError);
    }
  }

  async function replaceMv(
    songId: string,
    mv: {
      url: string;
      directorName: string;
      location: string;
      publishedOn: string;
      memo: string;
    } | null
  ): Promise<void> {
    if (!mv) {
      const { error: deleteError } = await supabase
        .from("orbit_track_mvs")
        .delete()
        .eq("track_id", songId);

      if (deleteError) {
        throw new RepositoryError("MV情報の削除に失敗しました", deleteError);
      }
      return;
    }

    const peopleMap = await ensurePeopleByNames(
      mv.directorName ? [mv.directorName] : []
    );
    const directorPersonId = mv.directorName ? (peopleMap.get(mv.directorName) ?? null) : null;

    const { error } = await supabase
      .from("orbit_track_mvs")
      .upsert(
        {
          track_id: songId,
          mv_url: mv.url,
          director_person_id: directorPersonId,
          location: mv.location || null,
          published_on: mv.publishedOn || null,
          memo: mv.memo || null,
        },
        { onConflict: "track_id" }
      );

    if (error) {
      throw new RepositoryError("MV情報の更新に失敗しました", error);
    }
  }

  async function replaceCostumes(
    songId: string,
    costumes: Array<{ stylistName: string; imagePath: string; note: string }>
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_track_costumes")
      .delete()
      .eq("track_id", songId);

    if (deleteError) {
      throw new RepositoryError("衣装情報の更新に失敗しました", deleteError);
    }

    if (costumes.length === 0) return;

    const peopleMap = await ensurePeopleByNames(
      costumes.map((costume) => costume.stylistName)
    );

    const inserts = costumes
      .map((costume, index) => {
        const stylistPersonId = peopleMap.get(costume.stylistName);
        if (!stylistPersonId) return null;

        return {
          track_id: songId,
          stylist_person_id: stylistPersonId,
          image_path: costume.imagePath,
          note: costume.note || null,
          sort_order: index,
        };
      })
      .filter((row): row is {
        track_id: string;
        stylist_person_id: string;
        image_path: string;
        note: string | null;
        sort_order: number;
      } => Boolean(row));

    if (inserts.length === 0) return;

    const { error: insertError } = await supabase
      .from("orbit_track_costumes")
      .insert(inserts);

    if (insertError) {
      throw new RepositoryError("衣装情報の登録に失敗しました", insertError);
    }
  }

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

  async function findTrackIdsByGroupId(groupId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("orbit_release_tracks")
      .select("track_id, orbit_releases!inner(group_id)")
      .eq("orbit_releases.group_id", groupId);

    if (error) {
      throw new RepositoryError("楽曲一覧の取得に失敗しました", error);
    }

    return uniqueStrings(
      ((data as GroupTrackIdRow[]) ?? []).map((row) => row.track_id)
    );
  }

  return {
    async findAll(filters) {
      if (filters?.groupId) {
        const trackIds = await findTrackIdsByGroupId(filters.groupId);
        return findManyByIds(trackIds, SONG_LIST_SELECT);
      }

      const { data, error } = await supabase
        .from("orbit_tracks")
        .select(SONG_LIST_SELECT)
        .order("title");

      if (error) {
        throw new RepositoryError("楽曲一覧の取得に失敗しました", error);
      }

      return (data as unknown as SongRow[]).map(mapSong);
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

      const { data: track, error: trackError } = await supabase
        .from("orbit_tracks")
        .insert({
          title: input.title.trim(),
          duration_seconds: durationSeconds,
        })
        .select("id")
        .single();

      if (trackError) {
        throw new RepositoryError("楽曲の作成に失敗しました", trackError);
      }

      const trackId = (track as { id: string }).id;

      try {
        await replaceReleaseLinks(trackId, releaseLinks);
        await replaceCredits(trackId, credits);
        await replaceFormation(trackId, releaseLinks.map((link) => link.releaseId), formationRows);
        await replaceMv(trackId, mv);
        await replaceCostumes(trackId, costumes);
      } catch (e) {
        await supabase.from("orbit_tracks").delete().eq("id", trackId);
        throw e;
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

      const { error: rpcError } = await supabase.rpc("update_track_with_relations", {
        p_track_id: id,
        p_title: input.title.trim(),
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
