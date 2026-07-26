"use client";

import type { ParticipantOption } from "@/components/admin/song/songFormShared";

type SongParticipantsSectionProps = {
  participantMemberIds: string[];
  centerMemberIds: string[];
  errors: Record<string, string>;
  // 候補は初出リリースの参加メンバー（#427）。未確定なら空になる。
  participantOptions: ParticipantOption[];
  selectedParticipantSummary: string;
  outOfGroupSelectedMemberNames: string[];
  outOfScopeSelectedMemberNames: string[];
  participantNameById: Map<string, string>;
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
  errors,
  participantOptions,
  selectedParticipantSummary,
  outOfGroupSelectedMemberNames,
  outOfScopeSelectedMemberNames,
  participantNameById,
  toggleParticipant,
  toggleCenter,
}: SongParticipantsSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-foreground-secondary">
          参加メンバー
        </label>
        <span className="text-xs text-foreground-secondary">
          {selectedParticipantSummary}
        </span>
      </div>

      {errors.participantMemberIds && (
        <p className="mb-2 text-xs text-danger-text">{errors.participantMemberIds}</p>
      )}

      {outOfGroupSelectedMemberNames.length > 0 && (
        <p className="mb-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground">
          楽曲グループ外: {outOfGroupSelectedMemberNames.join(" / ")}
        </p>
      )}

      {/* リリース紐づけを変更しても選択済みメンバーは自動削除しない。
          候補外になったメンバーは明示して、外す判断をユーザーに委ねる（#427） */}
      {outOfScopeSelectedMemberNames.length > 0 && (
        <p className="mb-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground">
          初出リリースの参加メンバー外: {outOfScopeSelectedMemberNames.join(" / ")}
        </p>
      )}

      <div className="max-h-56 overflow-y-auto rounded-lg border border-border-subtle p-2">
        {participantOptions.map((option) => {
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
        {participantOptions.length === 0 && (
          <p className="px-2 py-1 text-xs text-foreground-secondary">
            初出リリース未確定
          </p>
        )}
      </div>

      {/* センターは参加メンバー内から選ぶ。フォーメーションが無くても指定できる（#427） */}
      <div className="mt-3">
        <p className="mb-1 text-xs text-foreground-secondary">センター（最大2人）</p>
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
          {participantMemberIds.length === 0 && (
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
