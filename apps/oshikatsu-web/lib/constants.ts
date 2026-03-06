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

export const SONG_POSITIONS = ["フロント", "2列目", "3列目", "アンダー"] as const;
export type SongPosition = (typeof SONG_POSITIONS)[number];
