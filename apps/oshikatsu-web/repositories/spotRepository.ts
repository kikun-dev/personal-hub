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

function toAppearanceRow(spotId: string, input: CreateSpotAppearanceInput) {
  return {
    spot_id: spotId,
    source_type: input.sourceType,
    track_id: input.trackId || null,
    video_id: input.videoId || null,
    event_id: input.eventId || null,
    live_id: input.liveId || null,
    series_name: input.seriesName.trim() || null,
    appeared_on: input.appearedOn.trim() || null,
    note: input.note.trim() || null,
    link_url: input.linkUrl.trim() || null,
  };
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

      for (const appearance of input.appearances) {
        const { data: appearanceRow, error: appearanceError } = await writable
          .from("orbit_spot_appearances")
          .insert(toAppearanceRow(spot.id, appearance))
          .select("id")
          .single();

        if (appearanceError) {
          // 補償処理: 出来事の登録失敗時は作成したスポットを削除
          // （CASCADE で既に登録済みの出来事・メンバーも削除）
          await writable.from("orbit_spots").delete().eq("id", spot.id);
          throw new RepositoryError("出来事の登録に失敗しました", appearanceError);
        }

        if (appearance.memberIds.length > 0) {
          const { error: memberError } = await writable
            .from("orbit_spot_appearance_members")
            .insert(
              appearance.memberIds.map((memberId) => ({
                appearance_id: appearanceRow.id,
                member_id: memberId,
              }))
            );
          if (memberError) {
            // 補償処理: メンバー登録失敗時は作成したスポットを削除
            await writable.from("orbit_spots").delete().eq("id", spot.id);
            throw new RepositoryError("出来事のメンバー登録に失敗しました", memberError);
          }
        }
      }

      const created = await this.findById(spot.id);
      if (!created) {
        throw new RepositoryError("作成したスポットの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError("更新対象のスポットが見つかりません", null);
      }

      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { error: spotError } = await writable
        .from("orbit_spots")
        .update(toSpotRow(input))
        .eq("id", id);

      if (spotError) {
        throw new RepositoryError("スポットの更新に失敗しました", spotError);
      }

      // 既存の出来事を全削除して入力内容で再登録する（venue/live 系と同じ
      // 「全削除→再挿入」パターン。非アトミックだが既知の制限として許容する）。
      // 子テーブルの orbit_spot_appearance_members は ON DELETE CASCADE で
      // 一緒に削除される。
      const { error: deleteError } = await writable
        .from("orbit_spot_appearances")
        .delete()
        .eq("spot_id", id);

      if (deleteError) {
        throw new RepositoryError("出来事の更新に失敗しました", deleteError);
      }

      for (const appearance of input.appearances) {
        const { data: appearanceRow, error: appearanceError } = await writable
          .from("orbit_spot_appearances")
          .insert(toAppearanceRow(id, appearance))
          .select("id")
          .single();

        if (appearanceError) {
          throw new RepositoryError("出来事の登録に失敗しました", appearanceError);
        }

        if (appearance.memberIds.length > 0) {
          const { error: memberError } = await writable
            .from("orbit_spot_appearance_members")
            .insert(
              appearance.memberIds.map((memberId) => ({
                appearance_id: appearanceRow.id,
                member_id: memberId,
              }))
            );
          if (memberError) {
            throw new RepositoryError("出来事のメンバー登録に失敗しました", memberError);
          }
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
