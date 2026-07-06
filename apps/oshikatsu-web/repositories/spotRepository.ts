import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { SpotRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import type {
  CreateSpotInput,
  Spot,
  SpotAppearance,
  SpotListItem,
  SpotPhoto,
  SpotSourceSubtype,
} from "@/types/spot";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";

const SPOT_LIST_SELECT =
  "id, name, latitude, longitude, prefecture, google_maps_url, orbit_spot_appearances(source_type, orbit_spot_source_subtypes(name), orbit_spot_appearance_members(member_id))" as const;

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
  ),
  orbit_spot_photos(id, image_path, caption, sort_order)
` as const;

const SPOT_SUBTYPE_OPTION_SELECT = "id, source_type, name" as const;

type SpotListRow = SelectRows<"orbit_spots", typeof SPOT_LIST_SELECT>[number];
type SpotRow = SelectRows<"orbit_spots", typeof SPOT_DETAIL_SELECT>[number];
type SpotAppearanceRow = SpotRow["orbit_spot_appearances"][number];
type SpotPhotoRow = SpotRow["orbit_spot_photos"][number];
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

function mapSpotPhoto(row: SpotPhotoRow): SpotPhoto {
  return {
    id: row.id,
    imagePath: row.image_path,
    caption: row.caption,
    sortOrder: row.sort_order,
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
    photos: row.orbit_spot_photos
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapSpotPhoto),
  };
}

function mapSpotListItem(row: SpotListRow): SpotListItem {
  // スポット単一カテゴリは廃止したため、紐づく出来事の source_type を
  // 重複排除して「何の場所か」の集合として返す（#286）。
  const sourceTypes = Array.from(
    new Set(row.orbit_spot_appearances.map((appearance) => appearance.source_type))
  ) as SpotListItem["sourceTypes"];

  // フィルタ用は「種別×サブ種別×メンバー」を出来事単位で保持する（dedupeしない）。
  // (source_type, subtypeName) のキーで重複排除すると、メンバーが加わった際に
  // 同じキーで異なるメンバー構成の出来事が1件に潰れてしまうため。
  // 1スポットあたりの出来事は高々数件のため件数増は許容する。
  const appearanceTags: SpotListItem["appearanceTags"] = row.orbit_spot_appearances.map(
    (appearance) => ({
      sourceType: appearance.source_type as SpotListItem["sourceTypes"][number],
      subtypeName: appearance.orbit_spot_source_subtypes?.name ?? null,
      memberIds: appearance.orbit_spot_appearance_members.map((m) => m.member_id),
    })
  );

  return {
    id: row.id,
    name: row.name,
    sourceTypes,
    appearanceTags,
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

// #289: upsert_orbit_spot（migration 059）用のペイロード整形。
// トリム済みの値を渡す（空文字→NULL変換はRPC側のNULLIFが行う）。
// appearances/photos の出典FKゲーティング・sort_orderの配列順採番もRPC側が行うため、
// ここでは既存 toAppearanceRow 相当の値をそのまま渡してよい。
function toSpotPayload(input: CreateSpotInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    address: input.address.trim(),
    prefecture: input.prefecture.trim(),
    google_place_id: input.googlePlaceId.trim(),
    google_maps_url: input.googleMapsUrl.trim(),
    appearances: input.appearances.map((appearance) => ({
      source_type: appearance.sourceType,
      group_id: appearance.groupId,
      subtype_name: appearance.subtypeName.trim(),
      track_id: appearance.trackId,
      video_id: appearance.videoId,
      event_id: appearance.eventId,
      live_id: appearance.liveId,
      note: appearance.note,
      link_url: appearance.linkUrl,
      member_ids: appearance.memberIds,
    })),
    photos: input.photos.map((photo) => ({
      image_path: photo.imagePath.trim(),
      caption: photo.caption,
    })),
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
      // upsert_orbit_spot の p_id は生成型上 non-null な string になっているが、create
      // では新規作成のため p_id: null を送る必要がある（関数は null を「新規作成」の合図
      // として受け付ける）。生成型がこのケースを表現できない既知の制約のため、
      // TypedSupabaseClient にせず asWritableClient の返り値（未typed）のまま呼び出す。
      const writable = asWritableClient(supabase);
      const { data, error } = await writable.rpc("upsert_orbit_spot", {
        p_id: null,
        p_payload: toSpotPayload(input),
      });

      if (error) {
        throw new RepositoryError("スポットの作成に失敗しました", error);
      }

      const created = await this.findById(data as string);
      if (!created) {
        throw new RepositoryError("作成したスポットの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      // update では p_id に既存の非null文字列idを渡すため実ペイロードと生成型 Args が
      // 一致する。typed client で呼び出す。
      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { data, error } = await writable.rpc("upsert_orbit_spot", {
        p_id: id,
        p_payload: toSpotPayload(input),
      });

      if (error) {
        // RPC は対象スポットが存在しない場合 ERRCODE P0002 で例外を投げる
        // （migration 059）。存在しないIDへの更新をユーザー向けメッセージに変換する。
        if (error.code === "P0002") {
          throw new RepositoryError("更新対象のスポットが見つかりません", error);
        }
        throw new RepositoryError("スポットの更新に失敗しました", error);
      }

      const updated = await this.findById(data);
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

    // Storage の孤児掃除（update/delete の server action）用。findById の
    // 4テーブル join を写真パスの取得だけのために使わないための軽量クエリ。
    async findPhotoPaths(id) {
      const { data, error } = await supabase
        .from("orbit_spot_photos")
        .select("image_path")
        .eq("spot_id", id);

      if (error) {
        throw new RepositoryError("写真パスの取得に失敗しました", error);
      }

      return data.map((row) => row.image_path);
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
