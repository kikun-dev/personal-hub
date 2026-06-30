// 参加メンバーの人数を「◯人（1期生◯人、2期生◯人…）」形式に整形する。
// generation は数値想定の文字列。null/非数値（期不明）は「他◯人」として末尾にまとめる。
export function formatMemberCountSummary(
  generations: Array<string | null>
): string {
  const total = generations.length;
  if (total === 0) return "0人";

  const countByGeneration = new Map<number, number>();
  let unknownCount = 0;

  for (const generation of generations) {
    const parsed =
      generation != null && generation.trim() !== ""
        ? Number(generation)
        : NaN;
    if (Number.isInteger(parsed) && parsed > 0) {
      countByGeneration.set(parsed, (countByGeneration.get(parsed) ?? 0) + 1);
    } else {
      unknownCount += 1;
    }
  }

  // 期が1つも特定できない場合は内訳を出さず総数のみ
  if (countByGeneration.size === 0) {
    return `${total}人`;
  }

  const parts = Array.from(countByGeneration.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([generation, count]) => `${generation}期生${count}人`);

  if (unknownCount > 0) {
    parts.push(`他${unknownCount}人`);
  }

  return `${total}人（${parts.join("、")}）`;
}
