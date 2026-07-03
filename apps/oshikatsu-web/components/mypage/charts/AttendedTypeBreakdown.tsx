import { Badge } from "@/components/ui/Badge";
import type { AttendedTypeCount } from "@/usecases/getAttendanceStats";
import { ATTENDED_TYPE_LABELS } from "@/types/attendance";
import { ATTENDED_TYPE_COLORS } from "@/lib/chartColors";

type AttendedTypeBreakdownProps = {
  data: AttendedTypeCount[];
};

// 参戦種別（現地 / LV / 配信）の内訳を件数バッジで表示する（Issue #248）。
// 0件・1件でも破綻しないよう、全種別を固定表示し件数のみ0で出す。
export function AttendedTypeBreakdown({ data }: AttendedTypeBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <p className="py-4 text-center text-sm text-foreground/40">
        参戦記録がありません
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {data.map((item) => (
        <Badge
          key={item.attendedType}
          color={ATTENDED_TYPE_COLORS[item.attendedType]}
          label={`${ATTENDED_TYPE_LABELS[item.attendedType]} ${item.count}件`}
        />
      ))}
    </div>
  );
}
