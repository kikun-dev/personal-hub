import type { SetlistFormationRow, SetlistMember } from "@/types/live";
import { FormationRows } from "@/components/ui/FormationRows";

type SetlistFormationDisplayProps = {
  rows: SetlistFormationRow[];
  // センター判定用。#260 のフォーメーション行自体はセンター情報を持たないため、
  // 同アイテムの披露メンバー（members）と memberId で突き合わせる
  members: SetlistMember[];
};

// 楽曲詳細の FormationDisplay（components/songs/FormationDisplay.tsx）と同じ描画方針
// （列番号の降順で描画=最前列を最下段に積む、センターに★、#282で共通化した
// components/ui/FormationRows.tsx を利用）をセトリのフォーメーション行向けに
// 適用したもの（#261）。
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

  // セトリのフォーメーション行はセンター情報を持たないため、
  // 「1メンバー = { 表示名, isCenter }」に正規化してから FormationRows に渡す
  const normalizedRows = rows.map((row) => ({
    rowNumber: row.rowNumber,
    members: row.members.map((member) => ({
      memberId: member.memberId,
      memberNameJa: member.memberNameJa,
      isCenter: centerMemberIds.has(member.memberId),
    })),
  }));

  return (
    <div className="rounded-lg border border-foreground/10 p-3">
      <p className="mb-2 text-xs font-medium text-foreground/60">
        フォーメーション
      </p>
      <FormationRows rows={normalizedRows} size="xs" />
    </div>
  );
}
