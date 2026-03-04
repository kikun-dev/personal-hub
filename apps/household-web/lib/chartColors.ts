import type { OshikatsuGroup } from "@/lib/constants";

// カテゴリ別円グラフ用パレット（10色、インデックスでサイクル）
export const CATEGORY_COLORS: string[] = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
  "#84CC16", // lime-500
];

// 推し活グループ固定色
export const OSHIKATSU_GROUP_COLORS: Record<OshikatsuGroup, string> = {
  "乃木坂46": "#8B5CF6",
  "櫻坂46": "#EC4899",
  "日向坂46": "#38BDF8",
  "その他": "#9CA3AF",
};

// 各グループの活動タイプ用グラデーション（6色/グループ）
const OSHIKATSU_GROUP_ACTIVITY_PALETTES: Record<OshikatsuGroup, string[]> = {
  "乃木坂46": ["#A78BFA", "#C4B5FD", "#7C3AED", "#6D28D9", "#DDD6FE", "#EDE9FE"],
  "櫻坂46": ["#F472B6", "#FBCFE8", "#DB2777", "#BE185D", "#FCE7F3", "#FDF2F8"],
  "日向坂46": ["#7DD3FC", "#BAE6FD", "#0EA5E9", "#0284C7", "#E0F2FE", "#F0F9FF"],
  "その他": ["#D1D5DB", "#E5E7EB", "#6B7280", "#4B5563", "#F3F4F6", "#F9FAFB"],
};

export function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

export function getActivityColor(groupName: string, activityIndex: number): string {
  const palette = OSHIKATSU_GROUP_ACTIVITY_PALETTES[groupName as OshikatsuGroup]
    ?? OSHIKATSU_GROUP_ACTIVITY_PALETTES["その他"];
  return palette[activityIndex % palette.length];
}
