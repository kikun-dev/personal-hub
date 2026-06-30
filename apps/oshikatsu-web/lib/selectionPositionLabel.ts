import type { MemberSelectionPosition } from "@/types/release";

// アンダーのグループ別呼称（乃木坂=アンダー / 櫻坂=BACKS / 日向坂=ひなた坂）
const UNDER_LABEL_BY_GROUP: Record<string, string> = {
  "乃木坂46": "アンダー",
  "櫻坂46": "BACKS",
  "日向坂46": "ひなた坂",
};

// 福神(乃木坂) / 櫻エイト(櫻坂)。該当しないグループは front_special なし
const FRONT_SPECIAL_LABEL_BY_GROUP: Record<string, string> = {
  "乃木坂46": "福神",
  "櫻坂46": "櫻エイト",
};

export function getUnderSelectionLabel(
  groupNameJa: string | null | undefined
): string {
  return groupNameJa
    ? (UNDER_LABEL_BY_GROUP[groupNameJa] ?? "アンダー")
    : "アンダー";
}

export function getFrontSpecialSelectionLabel(
  groupNameJa: string | null | undefined
): string | null {
  return groupNameJa ? (FRONT_SPECIAL_LABEL_BY_GROUP[groupNameJa] ?? null) : null;
}

// 選抜ポジションを表示用ラベルに変換する。
// 優先度: センター → 福神/櫻エイト → 選抜(列) / アンダー(列) / ◯期生
export function formatSelectionPositionLabel(
  position: MemberSelectionPosition,
  generation: string | null
): string {
  const rowSuffix = position.rowNumber != null ? `${position.rowNumber}列目` : "";

  if (position.tier === "generation") {
    return generation ? `${generation}期生` : "期生";
  }

  if (position.tier === "under") {
    const underLabel = getUnderSelectionLabel(position.groupNameJa);
    if (position.isCenter) return `${underLabel}センター`;
    return rowSuffix ? `${underLabel}${rowSuffix}` : underLabel;
  }

  // senbatsu
  if (position.isCenter) return "センター";
  if (position.isFrontSpecial) {
    const frontLabel = getFrontSpecialSelectionLabel(position.groupNameJa);
    if (frontLabel) return rowSuffix ? `${frontLabel}${rowSuffix}` : frontLabel;
  }
  return rowSuffix ? `選抜${rowSuffix}` : "選抜";
}
