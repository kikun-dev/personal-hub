"use client";

import type { CreateReleaseMemberPositionInput, ReleaseType } from "@/types/release";

type ReleaseMemberPositionsSectionProps = {
  releaseType: ReleaseType | "";
  participantMemberIds: string[];
  memberNameById: Map<string, string>;
  frontSpecialLabel: string | null;
  getPosition: (memberId: string) => CreateReleaseMemberPositionInput;
  updatePosition: (
    memberId: string,
    patch: Partial<CreateReleaseMemberPositionInput>
  ) => void;
};

export function ReleaseMemberPositionsSection({
  releaseType,
  participantMemberIds,
  memberNameById,
  frontSpecialLabel,
  getPosition,
  updatePosition,
}: ReleaseMemberPositionsSectionProps) {
  if (releaseType !== "single" || participantMemberIds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground/70">
        選抜ポジション（手動指定）
      </label>
      <p className="text-xs text-foreground/50">
        選抜/アンダー/列/センターは楽曲のフォーメーションから自動表示されます。
        ここでは{frontSpecialLabel ? `${frontSpecialLabel}・` : ""}休業中のみ指定します。
        {frontSpecialLabel
          ? `（${frontSpecialLabel}は選抜=表題曲のメンバーにのみ反映されます）`
          : ""}
      </p>
      <div className="space-y-1">
        {participantMemberIds.map((memberId) => {
          const position = getPosition(memberId);
          return (
            <div
              key={memberId}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-foreground/10 p-2 text-xs"
            >
              <span className="text-sm text-foreground">
                {memberNameById.get(memberId) ?? memberId}
              </span>
              {frontSpecialLabel && (
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={position.isFrontSpecial}
                    onChange={(e) =>
                      updatePosition(memberId, {
                        isFrontSpecial: e.target.checked,
                      })
                    }
                  />
                  {frontSpecialLabel}
                </label>
              )}
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={position.isHiatus}
                  onChange={(e) =>
                    updatePosition(memberId, {
                      isHiatus: e.target.checked,
                    })
                  }
                />
                休業中
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
