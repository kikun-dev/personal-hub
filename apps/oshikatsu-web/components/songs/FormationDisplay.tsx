import type { SongFormationRow } from "@/types/song";
import { Card } from "@/components/ui/Card";

type FormationDisplayProps = {
  rows: SongFormationRow[];
};

export function FormationDisplay({ rows }: FormationDisplayProps) {
  if (rows.length === 0) {
    return null;
  }

  // 1列目(最前列)を最下段、最終列を最上段に積むため、列番号の降順で描画する
  const orderedRows = [...rows].sort((a, b) => b.rowNumber - a.rowNumber);

  return (
    <Card>
      <h2 className="mb-4 text-sm font-medium text-foreground/70">
        フォーメーション
      </h2>
      <div className="space-y-3">
        {orderedRows.map((row) => (
          <p key={row.rowNumber} className="text-center text-sm text-foreground">
            {row.members.map((member, index) => (
              <span key={`${row.rowNumber}-${member.memberId}`}>
                {index > 0 && " ・ "}
                {member.isCenter ? (
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
    </Card>
  );
}
