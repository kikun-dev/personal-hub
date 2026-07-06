import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { SpotRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import type {
  CreateSpotAppearanceInput,
  CreateSpotInput,
  Spot,
  SpotAppearance,
  SpotListItem,
  SpotSourceSubtype,
} from "@/types/spot";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";

const SPOT_LIST_SELECT =
  "id, name, latitude, longitude, prefecture, google_maps_url, orbit_spot_appearances(source_type, orbit_spot_source_subtypes(name))" as const;

const SPOT_DETAIL_SELECT = `
  id,
  name,
  description,
  latitude,
  longitude,
  address,
  prefecture,
  google_place_id,
  google_maps_url,
  orbit_spot_appearances(
    id,
    source_type,
    group_id,
    orbit_groups(id, name_ja),
    track_id,
    orbit_tracks(id, title),
    video_id,
    orbit_track_videos(id, video_type, track_id, orbit_tracks(title)),
    event_id,
    orbit_events(title, date),
    live_id,
    orbit_lives(id, name),
    subtype_id,
    orbit_spot_source_subtypes(id, name),
    note,
    link_url,
    created_at,
    orbit_spot_appearance_members(member_id, orbit_members(id, name_ja))
  )
` as const;

const SPOT_SUBTYPE_OPTION_SELECT = "id, source_type, name" as const;

type SpotListRow = SelectRows<"orbit_spots", typeof SPOT_LIST_SELECT>[number];
type SpotRow = SelectRows<"orbit_spots", typeof SPOT_DETAIL_SELECT>[number];
type SpotAppearanceRow = SpotRow["orbit_spot_appearances"][number];
type SpotSubtypeOptionRow = SelectRows<
  "orbit_spot_source_subtypes",
  typeof SPOT_SUBTYPE_OPTION_SELECT
>[number];

function mapSpotAppearance(row: SpotAppearanceRow): SpotAppearance {
  return {
    id: row.id,
    // source_type は DB 上 CHECK 制約で許容値を保証している string 列。
    // ドメイン型 SpotSourceType は null を持たないため、liveRepository の
    // live_type と同じ方針で無条件 cast する。
    sourceType: row.source_type as SpotAppearance["sourceType"],
    // group_id / subtype_id は DB 上 NULL 許容の FK（アプリ層では必須）。
    // 対応する join も nullable なため liveRepository の venue join と同じ
    // 方針で optional chaining + ?? null を使う。
    groupId: row.group_id,
    groupName: row.orbit_groups?.name_ja ?? null,
    trackId: row.track_id,
    trackTitle: row.orbit_tracks?.title ?? null,
    videoId: row.video_id,
    videoTrackId: row.orbit_track_videos?.track_id ?? null,
    videoTrackTitle: row.orbit_track_videos?.orbit_tracks?.title ?? null,
    videoType: row.orbit_track_videos?.video_type ?? null,
    eventId: row.event_id,
    eventTitle: row.orbit_events?.title ?? null,
    eventDate: row.orbit_events?.date ?? null,
    liveId: row.live_id,
    liveName: row.orbit_lives?.name ?? null,
    subtypeId: row.subtype_id,
    subtypeName: row.orbit_spot_source_subtypes?.name ?? null,
    note: row.note,
    linkUrl: row.link_url,
    members: row.orbit_spot_appearance_members.map((m) => ({
      id: m.orbit_members.id,
      name: m.orbit_members.name_ja,
    })),
  };
}

function mapSpot(row: SpotRow): Spot {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    prefecture: row.prefecture,
    googlePlaceId: row.google_place_id,
    googleMapsUrl: row.google_maps_url,
    appearances: row.orbit_spot_appearances
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(mapSpotAppearance),
  };
}

function mapSpotListItem(row: SpotListRow): SpotListItem {
  // スポット単一カテゴリは廃止したため、紐づく出来事の source_type を
  // 重複排除して「何の場所か」の集合として返す（#286）。
  const sourceTypes = Array.from(
    new Set(row.orbit_spot_appearances.map((appearance) => appearance.source_type))
  ) as SpotListItem["sourceTypes"];

  // フィルタ用は「種別×サブ種別」のペアで保持する（別々にフラット化すると
  // ペア情報が失われ、種別Aのスポットが種別Bのサブ種別でマッチしてしまう）。
  const tagByKey = new Map<string, SpotListItem["appearanceTags"][number]>();
  for (const appearance of row.orbit_spot_appearances) {
    const subtypeName = appearance.orbit_spot_source_subtypes?.name ?? null;
    tagByKey.set(`${appearance.source_type}:${subtypeName ?? ""}`, {
      sourceType: appearance.source_type as SpotListItem["sourceTypes"][number],
      subtypeName,
    });
  }

  return {
    id: row.id,
    name: row.name,
    sourceTypes,
    appearanceTags: Array.from(tagByKey.values()),
    latitude: row.latitude,
    longitude: row.longitude,
    prefecture: row.prefecture,
    googleMapsUrl: row.google_maps_url,
  };
}

function mapSubtypeOption(row: SpotSubtypeOptionRow): SpotSourceSubtype {
  return {
    id: row.id,
    sourceType: row.source_type,
    name: row.name,
  };
}

function toSpotRow(input: CreateSpotInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim() || null,
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    address: input.address.trim() || null,
    prefecture: input.prefecture.trim() || null,
    google_place_id: input.googlePlaceId.trim() || null,
    google_maps_url: input.googleMapsUrl.trim() || null,
  };
}

type AppearanceFkField = "trackId" | "videoId" | "eventId" | "liveId";

// 出典種別ごとに対応するFKフィールド（youtube 等の新種別や other、未知の値は
// 対応FKなし＝undefined）。
const APPEARANCE_FK_FIELD_BY_SOURCE_TYPE: Record<string, AppearanceFkField | undefined> = {
  mv: "trackId",
  video: "videoId",
  event: "eventId",
  live: "liveId",
};

// source_type × trim済みサブ種別名 のキー。orbit_spot_source_subtypes の
// unique index (source_type, name) に対応する find-or-create のキーとして使う。
function subtypeKey(sourceType: string, name: string): string {
  return `${sourceType}:${name}`;
}

function toAppearanceRow(
  spotId: string,
  input: CreateSpotAppearanceInput,
  subtypeIdByKey: Map<string, string>
) {
  // source_type に対応するFKだけを行に載せ、他のFKは常に null にする
  // （validateSpot が防ぐが、DB整合の多層防御）。
  const fkField = APPEARANCE_FK_FIELD_BY_SOURCE_TYPE[input.sourceType];
  const subtypeName = input.subtypeName.trim();
  return {
    spot_id: spotId,
    source_type: input.sourceType,
    group_id: input.groupId || null,
    track_id: fkField === "trackId" ? input.trackId || null : null,
    video_id: fkField === "videoId" ? input.videoId || null : null,
    event_id: fkField === "eventId" ? input.eventId || null : null,
    live_id: fkField === "liveId" ? input.liveId || null : null,
    subtype_id: subtypeName
      ? (subtypeIdByKey.get(subtypeKey(input.sourceType, subtypeName)) ?? null)
      : null,
    note: input.note.trim() || null,
    link_url: input.linkUrl.trim() || null,
  };
}

type ResolveSubtypeIdsResult = {
  idByKey: Map<string, string>;
  error: RepositoryError | null;
};

// appearances のうち subtypeName が非空のものについて、source_type × name の
// find-or-create を行い、キー（subtypeKey）→id のマップを返す。
// upsert(ignoreDuplicates: false) により、新規作成分・既存流用分の両方の id が
// select で返ってくる。
async function resolveSubtypeIds(
  writable: TypedSupabaseClient,
  appearances: CreateSpotAppearanceInput[]
): Promise<ResolveSubtypeIdsResult> {
  const rowsToUpsert = new Map<string, { source_type: string; name: string }>();
  for (const appearance of appearances) {
    const name = appearance.subtypeName.trim();
    if (!name) continue;
    const key = subtypeKey(appearance.sourceType, name);
    if (!rowsToUpsert.has(key)) {
      rowsToUpsert.set(key, { source_type: appearance.sourceType, name });
    }
  }

  if (rowsToUpsert.size === 0) {
    return { idByKey: new Map(), error: null };
  }

  const { data, error } = await writable
    .from("orbit_spot_source_subtypes")
    .upsert(Array.from(rowsToUpsert.values()), {
      onConflict: "source_type,name",
      ignoreDuplicates: false,
    })
    .select("id, source_type, name");

  if (error) {
    return {
      idByKey: new Map(),
      error: new RepositoryError("出来事のサブ種別の登録に失敗しました", error),
    };
  }

  const idByKey = new Map<string, string>();
  for (const row of data) {
    idByKey.set(subtypeKey(row.source_type, row.name), row.id);
  }
  return { idByKey, error: null };
}

type InsertAppearancesResult = {
  // 挿入済み出来事の id（メンバー挿入失敗時など、途中まで挿入された分の
  // 補償削除に使う）。
  ids: string[];
  error: RepositoryError | null;
};

// create/update で重複していた「出来事を一括挿入→メンバーを一括挿入」を共通化する。
// PostgREST の bulk insert は入力順で結果行を返すため、appearances の順序と
// 挿入結果（id）を素朴に対応付けてよい前提で実装している。
async function insertAppearances(
  writable: TypedSupabaseClient,
  spotId: string,
  appearances: CreateSpotAppearanceInput[]
): Promise<InsertAppearancesResult> {
  if (appearances.length === 0) {
    return { ids: [], error: null };
  }

  const { idByKey: subtypeIdByKey, error: subtypeError } = await resolveSubtypeIds(
    writable,
    appearances
  );
  if (subtypeError) {
    return { ids: [], error: subtypeError };
  }

  const { data: appearanceRows, error: appearanceError } = await writable
    .from("orbit_spot_appearances")
    .insert(
      appearances.map((appearance) => toAppearanceRow(spotId, appearance, subtypeIdByKey))
    )
    .select("id");

  if (appearanceError) {
    return {
      ids: [],
      error: new RepositoryError("出来事の登録に失敗しました", appearanceError),
    };
  }

  const ids = appearanceRows.map((row) => row.id);

  const memberRows = appearances.flatMap((appearance, index) =>
    appearance.memberIds.map((memberId) => ({
      appearance_id: ids[index],
      member_id: memberId,
    }))
  );

  if (memberRows.length > 0) {
    const { error: memberError } = await writable
      .from("orbit_spot_appearance_members")
      .insert(memberRows);

    if (memberError) {
      return {
        ids,
        error: new RepositoryError("出来事のメンバー登録に失敗しました", memberError),
      };
    }
  }

  return { ids, error: null };
}

export function createSpotRepository(supabase: OrbitReadClient): SpotRepository {
  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_spots")
        .select(SPOT_LIST_SELECT)
        .order("name");

      if (error) {
        throw new RepositoryError("スポット一覧の取得に失敗しました", error);
      }

      return data.map(mapSpotListItem);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_spots")
        .select(SPOT_DETAIL_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("スポットの取得に失敗しました", error);
      }

      return mapSpot(data);
    },

    async create(input) {
      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { data: spot, error: spotError } = await writable
        .from("orbit_spots")
        .insert(toSpotRow(input))
        .select("id")
        .single();

      if (spotError) {
        throw new RepositoryError("スポットの作成に失敗しました", spotError);
      }

      const { error: appearancesError } = await insertAppearances(
        writable,
        spot.id,
        input.appearances
      );

      if (appearancesError) {
        // 補償処理: 出来事/メンバーの登録失敗時は作成したスポットを削除
        // （CASCADE で既に登録済みの出来事・メンバーも削除される）
        await writable.from("orbit_spots").delete().eq("id", spot.id);
        throw appearancesError;
      }

      const created = await this.findById(spot.id);
      if (!created) {
        throw new RepositoryError("作成したスポットの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const writable: TypedSupabaseClient = asWritableClient(supabase);

      // 存在チェックは軽量な単体取得のみで行う（3テーブルjoinの findById は不要）。
      const { data: existing, error: existingError } = await writable
        .from("orbit_spots")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (existingError) {
        throw new RepositoryError("更新対象のスポットの確認に失敗しました", existingError);
      }
      if (!existing) {
        throw new RepositoryError("更新対象のスポットが見つかりません", null);
      }

      const { data: oldAppearances, error: oldAppearancesError } = await writable
        .from("orbit_spot_appearances")
        .select("id")
        .eq("spot_id", id);

      if (oldAppearancesError) {
        throw new RepositoryError("既存の出来事の取得に失敗しました", oldAppearancesError);
      }

      const { error: spotError } = await writable
        .from("orbit_spots")
        .update(toSpotRow(input))
        .eq("id", id);

      if (spotError) {
        throw new RepositoryError("スポットの更新に失敗しました", spotError);
      }

      // 新規挿入を先に行い、旧出来事の削除は最後に行う（venue/live 系の
      // 「全削除→再挿入」から順序を変更）。旧削除が最後なので、途中失敗しても
      // 既存の記録は失われない。完全なアトミック化は Issue #289 でRPC化予定。
      const { ids: insertedIds, error: insertError } = await insertAppearances(
        writable,
        id,
        input.appearances
      );

      if (insertError) {
        // 補償処理: 新規挿入分だけ削除し、旧データはそのまま残す
        // （CASCADE で新規分のメンバーも削除される）
        if (insertedIds.length > 0) {
          await writable.from("orbit_spot_appearances").delete().in("id", insertedIds);
        }
        throw insertError;
      }

      const oldIds = oldAppearances.map((row) => row.id);
      if (oldIds.length > 0) {
        const { error: deleteError } = await writable
          .from("orbit_spot_appearances")
          .delete()
          .in("id", oldIds);

        if (deleteError) {
          throw new RepositoryError("旧出来事の削除に失敗しました", deleteError);
        }
      }

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新したスポットの取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const writable = asWritableClient(supabase);
      const { error } = await writable.from("orbit_spots").delete().eq("id", id);

      if (error) {
        throw new RepositoryError("スポットの削除に失敗しました", error);
      }
    },

    async findSubtypeOptions() {
      const { data, error } = await supabase
        .from("orbit_spot_source_subtypes")
        .select(SPOT_SUBTYPE_OPTION_SELECT)
        .order("source_type")
        .order("name");

      if (error) {
        throw new RepositoryError("サブ種別一覧の取得に失敗しました", error);
      }

      return data.map(mapSubtypeOption);
    },
  };
}
