"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import type { ParticipantChoice } from "@/lib/songParticipantChoices";

type SongParticipantsSectionProps = {
  centerMemberIds: string[];
  errors: Record<string, string>;
  // 現候補と候補外既選択を統合した表示モデル（lib/songParticipantChoices）
  choices: ParticipantChoice[];
  selectedParticipantSummary: string;
  // 初出リリースが確定しているか。未確定と「参加メンバー未登録」を空状態で区別する。
  isFirstReleaseResolved: boolean;
  hasCandidate: boolean;
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
  centerMemberIds,
  errors,
  choices,
  selectedParticipantSummary,
  isFirstReleaseResolved,
  hasCandidate,
  participantNameById,
  showAllParticipantMembers,
  setShowAllParticipantMembers,
  toggleParticipant,
  toggleCenter,
}: SongParticipantsSectionProps) {
  const selectedChoices = choices.filter((choice) => choice.isSelected);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-foreground-secondary">
          参加メンバー
        </label>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-foreground-secondary">
            {selectedParticipantSummary}
          </span>
          {hasCandidate && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAllParticipantMembers((prev) => !prev)}
            >
              {showAllParticipantMembers ? "同グループのみ表示" : "他グループも表示"}
            </Button>
          )}
        </div>
      </div>

      {errors.participantMemberIds && (
        <p className="mb-2 text-xs text-danger-text">{errors.participantMemberIds}</p>
      )}

      <div className="max-h-56 overflow-y-auto rounded-lg border border-border-subtle p-2">
        {choices.map((choice) => (
          <label
            key={`participant-${choice.memberId}`}
            className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-subtle"
          >
            <input
              type="checkbox"
              checked={choice.isSelected}
              onChange={() => toggleParticipant(choice.memberId)}
            />
            <span>
              {choice.memberName}
              {/* 候補外の既選択は解除が必要。色だけに依存せずテキストで示す */}
              {choice.isOutOfScope ? (
                <span className="ml-1 text-xs text-danger-text">（候補外）</span>
              ) : (
                !choice.isInSongGroup && (
                  <span className="ml-1 text-xs text-foreground-secondary">
                    （グループ外）
                  </span>
                )
              )}
            </span>
          </label>
        ))}
        {choices.length === 0 && (
          <p className="px-2 py-1 text-xs text-foreground-secondary">
            {isFirstReleaseResolved
              ? "初出リリースに参加メンバー未登録"
              : "初出リリース未確定"}
          </p>
        )}
      </div>

      {/* センターは参加メンバー内から選ぶ。フォーメーションが無くても指定できる（#427） */}
      <div className="mt-3">
        <p className="mb-1 text-xs text-foreground-secondary">センター（最大2人）</p>
        <div className="flex flex-wrap gap-1.5">
          {selectedChoices.map((choice) => {
            const isCenter = centerMemberIds.includes(choice.memberId);
            const disabled = !isCenter && centerMemberIds.length >= 2;
            const name = participantNameById.get(choice.memberId) ?? choice.memberName;

            return (
              <button
                type="button"
                key={`center-${choice.memberId}`}
                onClick={() => toggleCenter(choice.memberId)}
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
          {selectedChoices.length === 0 && (
            <p className="text-xs text-foreground-secondary">—</p>
          )}
        </div>
        {errors.centerMemberIds && (
          <p className="mt-1 text-xs text-danger-text">{errors.centerMemberIds}</p>
        )}
      </div>
    </div>
  );
}
