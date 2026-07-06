export const SPOT_SOURCE_TYPES = [
  "mv",
  "video",
  "event",
  "live",
  "youtube",
  "lemino",
  "tv",
  "nogi_video",
  "magazine",
  "photobook",
  "blog_sns",
  "other",
] as const;

export type SpotSourceType = (typeof SPOT_SOURCE_TYPES)[number];

export const SPOT_SOURCE_TYPE_LABELS: Record<SpotSourceType, string> = {
  mv: "MV",
  video: "関連動画",
  event: "イベント",
  live: "ライブ",
  youtube: "YouTube",
  lemino: "Lemino",
  tv: "TV番組",
  nogi_video: "のぎ動画",
  magazine: "雑誌",
  photobook: "写真集",
  blog_sns: "ブログ・SNS",
  other: "その他",
};

export function isSpotSourceType(value: string): value is SpotSourceType {
  return (SPOT_SOURCE_TYPES as readonly string[]).includes(value);
}

export type SpotAppearanceMember = {
  id: string;
  name: string;
};

// 出来事の種別ごとの「サブ種別」マスタ（例: のぎ動画→あそぶだけ）。
// source_type × name で一意（migration 057）。
export type SpotSourceSubtype = {
  id: string;
  sourceType: string;
  name: string;
};

export type SpotAppearance = {
  id: string;
  sourceType: SpotSourceType;
  groupId: string | null;
  groupName: string | null;
  trackId: string | null;
  videoId: string | null;
  eventId: string | null;
  liveId: string | null;
  subtypeId: string | null;
  subtypeName: string | null;
  note: string | null;
  linkUrl: string | null;
  members: SpotAppearanceMember[];
};

export type Spot = {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  prefecture: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  appearances: SpotAppearance[];
};

// 出来事1件ぶんの「種別×サブ種別」のペア。フィルタとサブ種別候補の導出に使う。
// 種別とサブ種別を別々にフラット化するとペア情報が失われ、種別Aのスポットが
// 種別Bのサブ種別でマッチしてしまうため、必ずペアで保持する。
export type SpotAppearanceTag = {
  sourceType: SpotSourceType;
  subtypeName: string | null;
};

// 地図ピン表示用の軽量DTO。スポット単一カテゴリは廃止したため、
// そのスポットに紐づく出来事の種別を重複排除して表示する（#286）。
export type SpotListItem = {
  id: string;
  name: string;
  // 表示用（重複排除済み）。フィルタには appearanceTags を使う。
  sourceTypes: SpotSourceType[];
  // 紐づく出来事の種別×サブ種別ペア（重複排除済み）。
  appearanceTags: SpotAppearanceTag[];
  latitude: number;
  longitude: number;
  prefecture: string | null;
  // InfoWindow の「Googleマップで開く」リンク用。未設定のスポットもあるため null 許容。
  googleMapsUrl: string | null;
};

export type CreateSpotAppearanceInput = {
  sourceType: string;
  groupId: string;
  trackId: string;
  videoId: string;
  eventId: string;
  liveId: string;
  // 選択式 + 新規入力可のサブ種別名。id への解決は repository（保存時）が行う。
  subtypeName: string;
  note: string;
  linkUrl: string;
  memberIds: string[];
};

export type CreateSpotInput = {
  name: string;
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
