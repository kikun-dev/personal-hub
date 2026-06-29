// 参加メンバーの並びを「期(generation)昇順 → かな(name_kana)順」に統一するための比較関数。
// generation は数値（"1","2"...）想定。数値化できない/未設定は末尾に置く。
// 氏名は漢字だと読み順に並ばないため、かな読み(name_kana)で比較する。

export type MemberOrderInput = {
  generation: string | null;
  nameKana: string;
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
  // 同順位（同期 or どちらも未設定/非数値）は generation 文字列→かな読みで安定化
  if ((a.generation ?? "") !== (b.generation ?? "")) {
    return (a.generation ?? "").localeCompare(b.generation ?? "", "ja");
  }
  return a.nameKana.localeCompare(b.nameKana, "ja");
}

type MembershipGeneration = {
  group_id: string;
  generation: string | null;
};

// メンバーの所属から並び替え用の期を決定的に選ぶ。
// 優先グループ内の所属があればそれを、無ければ全所属を対象に、
// 期(数値)昇順 → group_id 昇順で先頭を採用する（DB返却順に依存しない）。
export function pickMembershipGeneration(
  memberships: MembershipGeneration[],
  preferredGroupIds: ReadonlySet<string>
): string | null {
  const preferred = memberships.filter((m) => preferredGroupIds.has(m.group_id));
  const pool = preferred.length > 0 ? preferred : memberships;
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => {
    const rankDiff = generationRank(a.generation) - generationRank(b.generation);
    if (rankDiff !== 0) return rankDiff;
    return a.group_id.localeCompare(b.group_id);
  });
  return sorted[0].generation;
}
