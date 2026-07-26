"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import type { ParticipantOption } from "@/components/admin/song/songFormShared";

type SongParticipantsSectionProps = {
  participantMemberIds: string[];
  centerMemberIds: string[];
  groupId: string;
  errors: Record<string, string>;
  // 初出リリースが確定しているか（#427）。未確定のときは候補を出さない。
  firstReleaseTitle: string | null;
  hasReleaseLink: boolean;
  visibleParticipantOptions: ParticipantOption[];
  outOfGroupSelectedMemberNames: string[];
  outOfScopeSelectedMemberNames: string[];
  participantNameById: Map<string, string>;
  showAllParticipantMembers: boolean;
  setShowAllParticipantMembers: Dispatch<SetStateAction<boolean>>;
  toggleParticipant: (memberId: string) => void;
  toggleCenter: (memberId: string) => void;
};

/**
 * 楽曲参加メンバーとセンターの入力（#427）。
 *
 * 候補は初出リリースの参加メンバーに限る。フォーメーションより前に置き、
 * 「参加メンバー → センター → フォーメーション」の順で段階的に登録できるようにする。
 * フォーメーションが未登録でもここだけで保存できる。
 */
export function SongParticipantsSection({
  participantMemberIds,
  centerMemberIds,
  groupId,
  errors,
  firstReleaseTitle,
  hasReleaseLink,
  visibleParticipantOptions,
  outOfGroupSelectedMemberNames,
  outOfScopeSelectedMemberNames,
  participantNameById,
  showAllParticipantMembers,
  setShowAllParticipantMembers,
  toggleParticipant,
  toggleCenter,
}: SongParticipantsSectionProps) {
  const isFirstReleaseResolved = firstReleaseTitle !== null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground-secondary">
          参加メンバー
        </label>
        {isFirstReleaseResolved && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAllParticipantMembers((prev) => !prev)}
          >
            {showAllParticipantMembers ? "同グループのみ表示" : "他グループも表示"}
          </Button>
        )}
      </div>

      {errors.participantMemberIds && (
        <p className="mb-2 text-xs text-danger-text">{errors.participantMemberIds}</p>
      )}

      {/* 初出リリース未確定の理由を具体的に示す。候補は出さず、推測で広げない（#427） */}
      {!isFirstReleaseResolved ? (
        <p className="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-foreground-secondary">
          {hasReleaseLink
            ? "紐づけたリリースにリリース日が未設定のため、参加メンバーの候補を表示できません。リリース日を設定してください"
            : "リリースを紐づけると、初出リリースの参加メンバーから選べます"}
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-foreground-secondary">
            初出リリース「{firstReleaseTitle}」の参加メンバーから選びます
          </p>

          {!showAllParticipantMembers && groupId && (
            <p className="mb-2 text-xs text-foreground-secondary">
              同グループ在籍歴のあるメンバーを優先表示中です
            </p>
          )}

          {outOfGroupSelectedMemberNames.length > 0 && (
            <p className="mb-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground">
              注意: 楽曲グループ外のメンバーが選択されています（
              {outOfGroupSelectedMemberNames.join(" / ")}）
            </p>
          )}

          {/* リリース紐づけを変更しても選択済みメンバーは自動削除しない。
              候補外になったメンバーは明示して、外す判断をユーザーに委ねる（#427） */}
          {outOfScopeSelectedMemberNames.length > 0 && (
            <p className="mb-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground">
              初出リリースの参加メンバー外が選択されています（
              {outOfScopeSelectedMemberNames.join(" / ")}）。このままでは保存できません
            </p>
          )}

          <div className="max-h-56 overflow-y-auto rounded-lg border border-border-subtle p-2">
            {visibleParticipantOptions.map((option) => {
              const checked = participantMemberIds.includes(option.memberId);

              return (
                <label
                  key={`participant-${option.memberId}`}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-subtle"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleParticipant(option.memberId)}
                  />
                  <span>
                    {option.memberName}
                    {!option.isInSongGroup && (
                      <span className="ml-1 text-xs text-foreground-secondary">
                        （グループ外）
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
            {visibleParticipantOptions.length === 0 && (
              <p className="px-2 py-1 text-xs text-foreground-secondary">
                選択可能なメンバーがいません
              </p>
            )}
          </div>

          <p className="mt-1 text-xs text-foreground-secondary">
            {participantMemberIds.length}人を選択中
          </p>
        </>
      )}

      {/* センターは参加メンバー内から選ぶ。フォーメーションが無くても指定できる（#427） */}
      <div className="mt-3">
        <p className="mb-1 text-xs text-foreground-secondary">
          センター（最大2人・任意）
        </p>
        {participantMemberIds.length === 0 ? (
          <p className="text-xs text-foreground-secondary">
            参加メンバーを選ぶとセンターを指定できます
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {participantMemberIds.map((memberId) => {
              const isCenter = centerMemberIds.includes(memberId);
              const disabled = !isCenter && centerMemberIds.length >= 2;
              const name = participantNameById.get(memberId) ?? memberId;

              return (
                <button
                  type="button"
                  key={`center-${memberId}`}
                  onClick={() => toggleCenter(memberId)}
                  disabled={disabled}
                  aria-pressed={isCenter}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                    isCenter
                      ? "border-border-strong bg-surface-selected font-semibold text-foreground"
                      : "border-border-subtle bg-background text-foreground hover:bg-surface-subtle"
                  }`}
                >
                  {/* 色だけに依存させず、選択状態を記号と太さでも示す */}
                  {isCenter ? "★ " : ""}
                  {name}
                </button>
              );
            })}
          </div>
        )}
        {errors.centerMemberIds && (
          <p className="mt-1 text-xs text-danger-text">{errors.centerMemberIds}</p>
        )}
      </div>
    </div>
  );
}
