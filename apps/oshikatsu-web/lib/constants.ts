export const GROUP_COLORS: Record<string, string> = {
  "乃木坂46": "#7B2D8E",
  "櫻坂46": "#E8518D",
  "日向坂46": "#54C3F1",
  "欅坂46": "#00843D",
  "けやき坂46": "#6DBE6E",
} as const;

export const BLOOD_TYPES = ["A", "B", "O", "AB"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];
