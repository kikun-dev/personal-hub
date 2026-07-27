import type { ValidationError } from "@/types/errors";

/**
 * 楽曲参加メンバーの許可集合（#427 / ADR 0007 追記 2026-07-26）。
 * `SongRepository.findFirstReleaseParticipants` の返却値をそのまま受ける。
 * null は初出リリース未確定を表す。
 */
export type FirstReleaseScope = {
  firstReleaseId: string;
  participantMemberIds: string[];
} | null;

/**
 * 不変条件 `楽曲参加メンバー ⊆ 初出リリース参加メンバー` を検証する。
 * 完全一致は要求しない（1つのリリース内で楽曲ごとに参加者が異なるのは正常）。
 *
 * scope はクライアント入力ではなく、保存境界でDBから解決した集合を渡すこと。
 * 判定に必要な事実をすべて引数で受け取る純関数にしてあるため、
 * 呼び出し側（createSong / updateSong）が権威的な取得を担う。
 */
export function validateParticipantScope(
  participantMemberIds: string[],
  scope: FirstReleaseScope
): ValidationError[] {
  // 参加メンバー未登録は正常な状態（フォーメーション未解禁より手前の段階）。
  // 初出リリースが未確定でもエラーにしない。
  if (participantMemberIds.length === 0) return [];

  if (scope === null) {
    return [
      {
        field: "participantMemberIds",
        message:
          "参加メンバーはリリース日が設定されたリリースを紐づけてから登録してください",
      },
    ];
  }

  const allowed = new Set(scope.participantMemberIds);
  const outOfScopeCount = participantMemberIds.filter(
    (memberId) => !allowed.has(memberId)
  ).length;

  if (outOfScopeCount === 0) return [];

  return [
    {
      field: "participantMemberIds",
      message: `参加メンバー${outOfScopeCount}人が初出リリースの参加メンバーに含まれていません`,
    },
  ];
}
