const NOGIZAKA_GROUP_NAME = "乃木坂46";
const SAKURAZAKA_GROUP_NAME = "櫻坂46";
const SAKURAZAKA_EIGHT_MIN_SINGLE = 1;
const SAKURAZAKA_EIGHT_MAX_SINGLE = 5;
// 櫻エイト期の表題曲フォーメーションで「櫻エイト」となる前方の列数（1・2列目）。
export const SAKURAZAKA_EIGHT_FRONT_ROW_COUNT = 2;

export function isSakurazakaEightEra(
  groupNameJa: string | null | undefined,
  numbering: number | null | undefined
): boolean {
  return (
    groupNameJa === SAKURAZAKA_GROUP_NAME &&
    numbering != null &&
    numbering >= SAKURAZAKA_EIGHT_MIN_SINGLE &&
    numbering <= SAKURAZAKA_EIGHT_MAX_SINGLE
  );
}

export function getFrontSpecialSelectionLabel(
  groupNameJa: string | null | undefined,
  numbering: number | null | undefined
): string | null {
  if (groupNameJa === NOGIZAKA_GROUP_NAME) return "福神";
  if (isSakurazakaEightEra(groupNameJa, numbering)) return "櫻エイト";
  return null;
}

export function getManualFrontSpecialSelectionLabel(
  groupNameJa: string | null | undefined
): string | null {
  return groupNameJa === NOGIZAKA_GROUP_NAME ? "福神" : null;
}
