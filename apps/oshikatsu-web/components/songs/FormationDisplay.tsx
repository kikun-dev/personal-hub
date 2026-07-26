import type { SongFormationRow, SongParticipant } from "@/types/song";
import { Card } from "@/components/ui/Card";
import { FormationRows } from "@/components/ui/FormationRows";

type FormationDisplayProps = {
  rows: SongFormationRow[];
  // センター判定用。センターの正典は楽曲参加メンバー（ADR 0007 2026-07-24改訂）で、
  // フォーメーション行自体はセンター情報を持たないため memberId で突き合わせる
  // （セトリ側の SetlistFormationDisplay と同じ正規化）。
  participants: SongParticipant[];
};

export function FormationDisplay({ rows, participants }: FormationDisplayProps) {
  if (rows.length === 0) {
    return null;
  }

  const centerMemberIds = new Set(
    participants
      .filter((participant) => participant.isCenter)
      .map((participant) => participant.memberId)
  );

  const normalizedRows = rows.map((row) => ({
    rowNumber: row.rowNumber,
    members: row.members.map((member) => ({
      memberId: member.memberId,
      memberNameJa: member.memberNameJa,
      isCenter: centerMemberIds.has(member.memberId),
    })),
  }));

  return (
    <Card>
      <h2 className="mb-4 text-sm font-medium text-foreground/70">
        フォーメーション
      </h2>
      <FormationRows rows={normalizedRows} size="sm" />
    </Card>
  );
}
