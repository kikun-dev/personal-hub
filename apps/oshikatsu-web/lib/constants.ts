export const BLOOD_TYPES = ["A", "B", "O", "AB", "不明"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const BIRTHDAY_COLOR = "#D946EF";

export const SONG_POSITIONS = ["フロント", "2列目", "3列目", "アンダー"] as const;
export type SongPosition = (typeof SONG_POSITIONS)[number];
