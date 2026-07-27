/**
 * 楽曲参加メンバー欄の表示モデル（#427）。
 *
 * 一覧には2種類の行が混在する。
 *   1. 現在の候補（初出リリースの参加メンバー）
 *   2. 候補外だが既に選択済みのメンバー
 *
 * 2 はリリース紐づけを変更した結果として生じる。暗黙削除しない方針のため
 * state には残るが、一覧へ出さないと解除できず保存もできない詰み状態になる。
 * 「他グループも表示」の切替状態に関わらず、選択済みは常に確認・解除できる。
 *
 * UI から独立した純関数にして、表示規則をテストで固定する。
 */

export type ParticipantChoiceSource = {
  memberId: string;
  memberName: string;
  memberKana: string;
  generation: string | null;
  isInSongGroup: boolean;
};

export type ParticipantChoice = {
  memberId: string;
  memberName: string;
  generation: string | null;
  isSelected: boolean;
  isInSongGroup: boolean;
  // 現在の候補（初出リリース参加メンバー）に含まれない既選択メンバー。
  // このまま保存すると保存境界で拒否されるため、解除を促す必要がある。
  isOutOfScope: boolean;
};

export type BuildParticipantChoicesInput = {
  // 初出リリースの参加メンバー。呼び出し側で期昇順→かな順に整列済みであること。
  options: ParticipantChoiceSource[];
  selectedMemberIds: string[];
  // 候補外メンバーの表示名解決用。未解決なら memberId をそのまま出す。
  nameById: ReadonlyMap<string, string>;
  // 「他グループも表示」がオンかどうか。オフでも選択済みは隠さない。
  showAllGroups: boolean;
};

export function buildParticipantChoices({
  options,
  selectedMemberIds,
  nameById,
  showAllGroups,
}: BuildParticipantChoicesInput): ParticipantChoice[] {
  const selected = new Set(selectedMemberIds);
  const optionIds = new Set(options.map((option) => option.memberId));

  const inScope = options
    .filter(
      (option) =>
        showAllGroups || option.isInSongGroup || selected.has(option.memberId)
    )
    .map((option) => ({
      memberId: option.memberId,
      memberName: option.memberName,
      generation: option.generation,
      isSelected: selected.has(option.memberId),
      isInSongGroup: option.isInSongGroup,
      isOutOfScope: false,
    }));

  // 候補外の既選択は末尾へまとめる。期が分からないため名前順で安定させる。
  const outOfScope = selectedMemberIds
    .filter((memberId) => !optionIds.has(memberId))
    .map((memberId) => ({
      memberId,
      memberName: nameById.get(memberId) ?? memberId,
      generation: null,
      isSelected: true,
      isInSongGroup: false,
      isOutOfScope: true,
    }))
    .sort((a, b) => a.memberName.localeCompare(b.memberName, "ja"));

  return [...inScope, ...outOfScope];
}

/**
 * 人数内訳（formatMemberCountSummary）へ渡す期の一覧。
 * 候補外の既選択も母数に含める。表示上「選択中」である以上、
 * サマリーの人数と一覧のチェック数を食い違わせない。
 */
export function selectedGenerationsForSummary(
  choices: ParticipantChoice[]
): Array<string | null> {
  return choices
    .filter((choice) => choice.isSelected)
    .map((choice) => choice.generation);
}
