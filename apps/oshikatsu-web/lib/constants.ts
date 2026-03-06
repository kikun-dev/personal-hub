export const BLOOD_TYPES = ["A", "B", "O", "AB", "不明"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const BIRTHDAY_COLOR = "#D946EF";

export const SNS_TYPES = [
  { value: "x", label: "X" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "blog", label: "Blog" },
  { value: "other", label: "Other" },
] as const;
export type SnsType = (typeof SNS_TYPES)[number]["value"];

export const REGULAR_WORK_TYPES = [
  { value: "tv", label: "TV" },
  { value: "radio", label: "Radio" },
  { value: "web", label: "Web" },
  { value: "stage", label: "Stage" },
  { value: "magazine", label: "Magazine" },
  { value: "other", label: "Other" },
] as const;
export type RegularWorkType = (typeof REGULAR_WORK_TYPES)[number]["value"];

export const GROUP_MAX_GENERATIONS: Record<string, number> = {
  "乃木坂46": 6,
  "櫻坂46": 4,
  "日向坂46": 5,
  "欅坂46": 2,
  "けやき坂46": 3,
};

export const GROUP_PENLIGHT_COLOR_NAMES: Record<string, string[]> = {
  "乃木坂46": [
    "白",
    "オレンジ",
    "青",
    "黄",
    "紫",
    "緑",
    "ピンク",
    "赤",
    "水色",
    "黄緑",
    "ターコイズ",
  ],
  "櫻坂46": [
    "ホワイト",
    "サクラピンク",
    "グリーン",
    "イエロー",
    "レッド",
    "パステルブルー",
    "パープル",
    "ピンク",
    "エメラルドグリーン",
    "ライトグリーン",
    "バイオレット",
    "パールグリーン",
    "パッションピンク",
    "オレンジ",
    "ブルー",
  ],
  "日向坂46": [
    "パステルブルー",
    "エメラルドグリーン",
    "グリーン",
    "パールグリーン",
    "ライトグリーン",
    "イエロー",
    "オレンジ",
    "レッド",
    "ホワイト",
    "サクラピンク",
    "ピンク",
    "パッションピンク",
    "バイオレット",
    "パープル",
    "ブルー",
  ],
  "欅坂46": [
    "グリーン",
    "イエロー",
    "レッド",
    "パールブルー",
    "パープル",
    "ホットピンク",
    "ターコイズ",
    "ライトブルー",
    "バイオレット",
    "パールピンク",
    "パールグリーン",
    "ショッキングピンク",
    "ホワイト",
    "オレンジ",
    "ブルー",
  ],
  "けやき坂46": [
    "グリーン",
    "イエロー",
    "レッド",
    "パールブルー",
    "パープル",
    "ホットピンク",
    "ターコイズ",
    "ライトブルー",
    "バイオレット",
    "パールピンク",
    "パールグリーン",
    "ショッキングピンク",
    "ホワイト",
    "オレンジ",
    "ブルー",
  ],
};

export const SONG_POSITIONS = ["フロント", "2列目", "3列目", "アンダー"] as const;
export type SongPosition = (typeof SONG_POSITIONS)[number];
