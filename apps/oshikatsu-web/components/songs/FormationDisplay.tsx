import type { SongFormationRow } from "@/types/song";
import { Card } from "@/components/ui/Card";

type FormationDisplayProps = {
  rows: SongFormationRow[];
};

export function FormationDisplay({ rows }: FormationDisplayProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="mb-4 text-sm font-medium text-foreground/70">
        フォーメーション
      </h2>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.rowNumber} className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-foreground/10" />
              <span className="text-xs text-foreground/50">{row.rowNumber}列目</span>
              <div className="h-px flex-1 bg-foreground/10" />
            </div>
            <p className="text-center text-sm text-foreground">
              {row.members.map((member, index) => (
                <span key={`${row.rowNumber}-${member.memberId}`}>
                  {index > 0 && " ・ "}
                  {member.memberNameJa}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
