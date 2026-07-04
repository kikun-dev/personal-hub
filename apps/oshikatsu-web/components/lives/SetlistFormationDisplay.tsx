import type { SetlistFormationRow, SetlistMember } from "@/types/live";

type SetlistFormationDisplayProps = {
  rows: SetlistFormationRow[];
  // センター判定用。#260 のフォーメーション行自体はセンター情報を持たないため、
  // 同アイテムの披露メンバー（members）と memberId で突き合わせる
  members: SetlistMember[];
};

// 楽曲詳細の FormationDisplay（components/songs/FormationDisplay.tsx）と同じ描画方針
// （列番号の降順で描画=最前列を最下段に積む、センターに★）をセトリのフォーメーション
// 行向けに適用したもの（#261）。
export function SetlistFormationDisplay({
  rows,
  members,
}: SetlistFormationDisplayProps) {
  if (rows.length === 0) {
    return null;
  }

  const centerMemberIds = new Set(
    members.filter((member) => member.isCenter).map((member) => member.memberId)
  );

  const orderedRows = [...rows].sort((a, b) => b.rowNumber - a.rowNumber);

  return (
    <div className="rounded-lg border border-foreground/10 p-3">
      <p className="mb-2 text-xs font-medium text-foreground/60">
        フォーメーション
      </p>
      <div className="space-y-2">
        {orderedRows.map((row) => (
          <p
            key={row.rowNumber}
            className="text-center text-xs text-foreground"
          >
            {row.members.map((member, index) => (
              <span key={`${row.rowNumber}-${member.memberId}`}>
                {index > 0 && " ・ "}
                {centerMemberIds.has(member.memberId) ? (
                  <span className="font-bold text-amber-600">
                    ★{member.memberNameJa}
                  </span>
                ) : (
                  member.memberNameJa
                )}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
