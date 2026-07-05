export const SPOT_CATEGORIES = [
  "mv_location",
  "show_location",
  "hit_kigan",
  "live_related",
  "other",
] as const;

export type SpotCategory = (typeof SPOT_CATEGORIES)[number];

export const SPOT_CATEGORY_LABELS: Record<SpotCategory, string> = {
  mv_location: "MV撮影地",
  show_location: "番組ロケ地",
  hit_kigan: "ヒット祈願",
  live_related: "ライブ関連",
  other: "その他",
};

export function isSpotCategory(value: string): value is SpotCategory {
  return (SPOT_CATEGORIES as readonly string[]).includes(value);
}

export const SPOT_SOURCE_TYPES = [
  "mv",
  "video",
  "event",
  "live",
  "other",
] as const;

export type SpotSourceType = (typeof SPOT_SOURCE_TYPES)[number];

export const SPOT_SOURCE_TYPE_LABELS: Record<SpotSourceType, string> = {
  mv: "MV",
  video: "関連動画",
  event: "イベント",
  live: "ライブ",
  other: "その他",
};

export function isSpotSourceType(value: string): value is SpotSourceType {
  return (SPOT_SOURCE_TYPES as readonly string[]).includes(value);
}

export type SpotAppearanceMember = {
  id: string;
  name: string;
};

export type SpotAppearance = {
  id: string;
  sourceType: SpotSourceType;
  trackId: string | null;
  videoId: string | null;
  eventId: string | null;
  liveId: string | null;
  seriesName: string | null;
  appearedOn: string | null;
  note: string | null;
  linkUrl: string | null;
  members: SpotAppearanceMember[];
};

export type Spot = {
  id: string;
  name: string;
  category: SpotCategory;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  prefecture: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  appearances: SpotAppearance[];
};

// 地図ピン表示用の軽量DTO。
export type SpotListItem = {
  id: string;
  name: string;
  category: SpotCategory;
  latitude: number;
  longitude: number;
  prefecture: string | null;
};

export type CreateSpotAppearanceInput = {
  sourceType: string;
  trackId: string;
  videoId: string;
  eventId: string;
  liveId: string;
  seriesName: string;
  appearedOn: string;
  note: string;
  linkUrl: string;
  memberIds: string[];
};

export type CreateSpotInput = {
  name: string;
  category: string;
  description: string;
  latitude: string;
  longitude: string;
  address: string;
  prefecture: string;
  googlePlaceId: string;
  googleMapsUrl: string;
  appearances: CreateSpotAppearanceInput[];
};

export type UpdateSpotInput = CreateSpotInput;
