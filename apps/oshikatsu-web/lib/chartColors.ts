import type { AttendedType } from "@/types/attendance";

// 参加種別バッジ・チャート用の固定色（現地 / LV / 配信）。
export const ATTENDED_TYPE_COLORS: Record<AttendedType, string> = {
  onsite: "#3B82F6", // blue-500
  live_viewing: "#8B5CF6", // violet-500
  streaming: "#10B981", // emerald-500
};

// 年別チャートのバー色。
export const YEARLY_BAR_COLOR = "#3B82F6"; // blue-500

// グループ別チャートで色未設定（「その他」グループ）の場合のフォールバック色。
export const FALLBACK_GROUP_COLOR = "#9CA3AF"; // gray-400
