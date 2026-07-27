/**
 * フォーメーション列の編集ロジック（#423）。
 *
 * 楽曲登録（`SongFormationSection`）とセットリスト（`SetlistEditor`）で
 * 同じ操作モデルを使うため、列の状態遷移を UI から独立した純関数に集める。
 * 画面ごとに異なるのは「候補メンバーの供給源」だけで、列の振る舞いは共通。
 *
 * 用語:
 * - 候補メンバー: その画面でフォーメーションへ割り当てられるメンバー。
 *   楽曲登録では楽曲参加メンバー、セットリストでは披露メンバー。
 * - 未配置: 候補メンバーのうち、どの列にも割り当てられていないもの。
 * - 候補外配置: 候補メンバーでないのに列へ配置されているもの。
 *   楽曲マスタからのコピーや、候補が変わる前に保存された既存データで生じる。
 */

export type FormationRowLike = {
  memberCount: string;
  memberIds: string[];
};

/**
 * 列人数の入力文字列を非負整数へ正規化する。数値にならない値は0扱い。
 */
export function parseMemberCount(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

/**
 * 列人数を変更する。減らしたときは超過分の割当を末尾から落とす。
 * 入力文字列はそのまま保持し、検証（列人数 == 割当人数）は保存境界で行う。
 */
export function updateRowMemberCount<T extends FormationRowLike>(
  row: T,
  memberCount: string
): T {
  const nextCount = parseMemberCount(memberCount);
  return {
    ...row,
    memberCount,
    memberIds: row.memberIds.slice(0, nextCount),
  };
}

/**
 * 列内のメンバー割当を切り替える。列人数に達している場合は追加しない。
 * 既に割り当て済みなら外す（このとき列人数の上限は見ない）。
 */
export function toggleRowMember<T extends FormationRowLike>(
  row: T,
  memberId: string
): T {
  if (row.memberIds.includes(memberId)) {
    return {
      ...row,
      memberIds: row.memberIds.filter((id) => id !== memberId),
    };
  }

  if (row.memberIds.length >= parseMemberCount(row.memberCount)) {
    return row;
  }

  return { ...row, memberIds: [...row.memberIds, memberId] };
}

/**
 * 指定メンバーを全列から外す。
 * 候補メンバーから外すときに、配置も同じ state 更新で落とすために使う。
 */
export function removeMemberFromRows<T extends FormationRowLike>(
  rows: T[],
  memberId: string
): T[] {
  return rows.map((row) => ({
    ...row,
    memberIds: row.memberIds.filter((id) => id !== memberId),
  }));
}

/**
 * 全列に配置されているメンバーID（重複排除、列順→列内順）。
 */
export function assignedMemberIds(rows: FormationRowLike[]): string[] {
  return Array.from(new Set(rows.flatMap((row) => row.memberIds)));
}

/**
 * 未配置の候補メンバーID。候補の並び順を保つ。
 */
export function unplacedMemberIds(
  rows: FormationRowLike[],
  candidateMemberIds: string[]
): string[] {
  const assigned = new Set(assignedMemberIds(rows));
  return candidateMemberIds.filter((memberId) => !assigned.has(memberId));
}

/**
 * 候補外なのに配置されているメンバーID。
 * 楽曲マスタからのコピーや既存データで生じ、そのままでは保存境界で弾かれる。
 * 一覧へ出して解除できるようにするために使う。
 */
export function outOfCandidateAssignedMemberIds(
  rows: FormationRowLike[],
  candidateMemberIds: string[]
): string[] {
  const candidates = new Set(candidateMemberIds);
  return assignedMemberIds(rows).filter((memberId) => !candidates.has(memberId));
}

/**
 * フォーメーションを登録するかどうか。1列でもあれば登録扱い。
 * 「列はあるが全列が空」も登録扱いとし、保存境界で未配置エラーにする
 * （列を消し忘れたまま保存されるのを防ぐ）。
 */
export function hasFormation(rows: FormationRowLike[]): boolean {
  return rows.length > 0;
}
