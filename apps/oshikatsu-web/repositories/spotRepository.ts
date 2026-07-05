import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { SpotRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import type {
  CreateSpotAppearanceInput,
  CreateSpotInput,
  Spot,
  SpotAppearance,
  SpotListItem,
} from "@/types/spot";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";

const SPOT_LIST_SELECT =
  "id, name, category, latitude, longitude, prefecture" as const;

const SPOT_DETAIL_SELECT = `
  id,
  name,
  category,
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
    track_id,
    video_id,
    event_id,
    live_id,
    series_name,
    appeared_on,
    note,
    link_url,
    created_at,
    orbit_spot_appearance_members(member_id, orbit_members(id, name_ja))
  )
` as const;

type SpotListRow = SelectRows<"orbit_spots", typeof SPOT_LIST_SELECT>[number];
type SpotRow = SelectRows<"orbit_spots", typeof SPOT_DETAIL_SELECT>[number];
type SpotAppearanceRow = SpotRow["orbit_spot_appearances"][number];

function mapSpotAppearance(row: SpotAppearanceRow): SpotAppearance {
  return {
    id: row.id,
    // source_type は DB 上 CHECK 制約で許容値を保証している string 列。
    // ドメイン型 SpotSourceType は null を持たないため、liveRepository の
    // live_type と同じ方針で無条件 cast する。
    sourceType: row.source_type as SpotAppearance["sourceType"],
    trackId: row.track_id,
    videoId: row.video_id,
    eventId: row.event_id,
    liveId: row.live_id,
    seriesName: row.series_name,
    appearedOn: row.appeared_on,
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
    // category も source_type と同様、CHECK 制約で許容値を保証している string 列。
    category: row.category as Spot["category"],
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
  return {
    id: row.id,
    name: row.name,
    category: row.category as SpotListItem["category"],
    latitude: row.latitude,
    longitude: row.longitude,
    prefecture: row.prefecture,
  };
}

function toSpotRow(input: CreateSpotInput) {
  return {
    name: input.name.trim(),
    category: input.category,
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

// 出典種別ごとに対応するFKフィールド（other や未知の値は対応FKなし＝undefined）。
const APPEARANCE_FK_FIELD_BY_SOURCE_TYPE: Record<string, AppearanceFkField | undefined> = {
  mv: "trackId",
  video: "videoId",
  event: "eventId",
  live: "liveId",
};

function toAppearanceRow(spotId: string, input: CreateSpotAppearanceInput) {
  // source_type に対応するFKだけを行に載せ、他のFKは常に null にする
  // （validateSpot が防ぐが、DB整合の多層防御）。
  const fkField = APPEARANCE_FK_FIELD_BY_SOURCE_TYPE[input.sourceType];
  return {
    spot_id: spotId,
    source_type: input.sourceType,
    track_id: fkField === "trackId" ? input.trackId || null : null,
    video_id: fkField === "videoId" ? input.videoId || null : null,
    event_id: fkField === "eventId" ? input.eventId || null : null,
    live_id: fkField === "liveId" ? input.liveId || null : null,
    series_name: input.seriesName.trim() || null,
    appeared_on: input.appearedOn.trim() || null,
    note: input.note.trim() || null,
    link_url: input.linkUrl.trim() || null,
  };
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

  const { data: appearanceRows, error: appearanceError } = await writable
    .from("orbit_spot_appearances")
    .insert(appearances.map((appearance) => toAppearanceRow(spotId, appearance)))
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
  };
}
