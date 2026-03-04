export const BLOOD_TYPES = ["A", "B", "O", "AB"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const BIRTHDAY_COLOR = "#D946EF";
