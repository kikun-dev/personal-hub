import type { AttendedType } from "@/types/attendance";
import { ATTENDED_TYPE_LABELS } from "@/types/attendance";
import { Badge } from "@/components/ui/Badge";

type AttendedTypeBadgeProps = {
  attendedType: AttendedType;
};

// 参戦種別を示す小さなバッジ。AttendanceControl（ライブ詳細の参戦記録表示）と
// マイページ（#247）の参戦記録一覧の両方で使う共通表示。
export function AttendedTypeBadge({ attendedType }: AttendedTypeBadgeProps) {
  return <Badge label={ATTENDED_TYPE_LABELS[attendedType]} className="px-2" />;
}
