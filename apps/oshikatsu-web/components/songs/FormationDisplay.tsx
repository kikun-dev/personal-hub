import type { SongFormationRow } from "@/types/song";
import { Card } from "@/components/ui/Card";
import { FormationRows } from "@/components/ui/FormationRows";

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
      <FormationRows rows={rows} size="sm" />
    </Card>
  );
}
