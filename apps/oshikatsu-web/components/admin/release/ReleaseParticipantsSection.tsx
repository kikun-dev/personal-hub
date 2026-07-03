"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import type { ReleaseParticipantOption } from "@/components/admin/release/releaseFormShared";

type ReleaseParticipantsSectionProps = {
  participantMemberIds: string[];
  visibleParticipantOptions: ReleaseParticipantOption[];
  outOfGroupSelectedMemberNames: string[];
  canAutoRoster: boolean;
  isComputingRoster: boolean;
  showAllParticipantMembers: boolean;
  setShowAllParticipantMembers: Dispatch<SetStateAction<boolean>>;
  errors: Record<string, string>;
  groupId: string;
  handleAutoRoster: () => void;
  toggleParticipant: (memberId: string) => void;
};

export function ReleaseParticipantsSection({
  participantMemberIds,
  visibleParticipantOptions,
  outOfGroupSelectedMemberNames,
  canAutoRoster,
  isComputingRoster,
  showAllParticipantMembers,
  setShowAllParticipantMembers,
  errors,
  groupId,
  handleAutoRoster,
  toggleParticipant,
}: ReleaseParticipantsSectionProps) {
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label className="block text-sm font-medium text-foreground/70">
          参加メンバー
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoRoster}
            disabled={!canAutoRoster || isComputingRoster}
            className="rounded-lg border border-foreground/10 px-2 py-1 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40"
          >
            {isComputingRoster ? "計算中..." : "リリース日・グループから自動入力"}
          </button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAllParticipantMembers((prev) => !prev)}
          >
            {showAllParticipantMembers ? "同グループのみ表示" : "他グループも表示"}
          </Button>
        </div>
      </div>
      {!canAutoRoster && (
        <p className="mb-1 text-xs text-foreground/40">
          ※自動入力にはグループの選択とリリース日の入力が必要です
        </p>
      )}
      {errors.participantMemberIds && (
        <p className="mb-1 text-xs text-red-500">{errors.participantMemberIds}</p>
      )}
      {!showAllParticipantMembers && groupId && (
        <p className="mb-2 text-xs text-foreground/50">
          同グループ在籍歴のあるメンバーを優先表示中です
        </p>
      )}
      {outOfGroupSelectedMemberNames.length > 0 && (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          注意: リリースグループ外のメンバーが選択されています（
          {outOfGroupSelectedMemberNames.join(" / ")}）
        </p>
      )}
      <div className="max-h-64 overflow-y-auto rounded-lg border border-foreground/10 p-2">
        {visibleParticipantOptions.map((member) => (
          <label
            key={member.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
          >
            <input
              type="checkbox"
              checked={participantMemberIds.includes(member.id)}
              onChange={() => toggleParticipant(member.id)}
              className="rounded"
            />
            <span className="text-foreground">
              {member.nameJa}
              {!member.isInReleaseGroup && (
                <span className="ml-1 text-xs text-amber-600">(グループ外)</span>
              )}
            </span>
          </label>
        ))}
        {visibleParticipantOptions.length === 0 && (
          <p className="px-2 py-1 text-xs text-foreground/40">
            選択中グループに在籍歴のあるメンバーがいません
          </p>
        )}
      </div>
    </div>
  );
}
