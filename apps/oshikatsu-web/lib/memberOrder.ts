// 参加メンバーの並びを「期(generation)昇順 → 名前順」に統一するための比較関数。
// generation は数値（"1","2"...）想定。数値化できない/未設定は末尾に置く。

export type MemberOrderInput = {
  generation: string | null;
  name: string;
};

function generationRank(generation: string | null): number {
  if (!generation) return Number.POSITIVE_INFINITY;
  const value = Number(generation);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function compareByGenerationThenName(
  a: MemberOrderInput,
  b: MemberOrderInput
): number {
  const rankA = generationRank(a.generation);
  const rankB = generationRank(b.generation);
  if (rankA !== rankB) return rankA - rankB;
  // 同順位（同期 or どちらも未設定/非数値）は generation 文字列→名前で安定化
  if ((a.generation ?? "") !== (b.generation ?? "")) {
    return (a.generation ?? "").localeCompare(b.generation ?? "", "ja");
  }
  return a.name.localeCompare(b.name, "ja");
}
