/**
 * センター指定の選択規則（#423）。
 *
 * 楽曲登録（参加メンバー欄）とセットリスト（披露メンバー欄）で同じ上限・
 * 同じ切り替え規則を使うため、判定を純関数へ集める。
 * ADR 0007 追記 §5 / §1 により、センターは対象メンバー内の最大2人。
 * 「フォーメーションがある場合は1列目に含まれる」は保存境界の検証で扱う。
 */

export const MAX_CENTERS = 2;

/**
 * 上限に達しているため、これ以上センターを追加できないか。
 * 既にセンターのメンバーは解除できるので、その場合は false。
 */
export function isCenterAdditionBlocked(
  centerMemberIds: string[],
  memberId: string,
  max: number = MAX_CENTERS
): boolean {
  if (centerMemberIds.includes(memberId)) return false;
  return centerMemberIds.length >= max;
}

/**
 * センター指定を切り替える。上限に達している場合、未選択メンバーは追加しない。
 * 解除は常に許可する（上限を超えた既存データを解消できるようにするため）。
 */
export function toggleCenterSelection(
  centerMemberIds: string[],
  memberId: string,
  max: number = MAX_CENTERS
): string[] {
  if (centerMemberIds.includes(memberId)) {
    return centerMemberIds.filter((id) => id !== memberId);
  }
  if (centerMemberIds.length >= max) {
    return centerMemberIds;
  }
  return [...centerMemberIds, memberId];
}
