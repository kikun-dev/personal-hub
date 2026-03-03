export const OSHIKATSU_ACTIVITY_TYPES = [
  "ライブ・コンサート",
  "グッズ購入",
  "CD・DVD・Blu-ray",
  "配信・サブスク",
  "遠征・交通費",
  "宿泊",
  "飲食",
  "雑誌・書籍",
  "ファンクラブ",
  "イベント・舞台",
  "その他",
] as const;

export type OshikatsuActivityType =
  (typeof OSHIKATSU_ACTIVITY_TYPES)[number];
