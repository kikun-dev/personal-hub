import type { AttendedType } from "@/types/attendance";
import { ATTENDED_TYPE_LABELS } from "@/types/attendance";

type AttendedTypeBadgeProps = {
  attendedType: AttendedType;
};

// 参加種別を示す小さなバッジ。AttendanceControl（ライブ詳細の参加記録表示）と
// マイページ（#247）の参加記録一覧の両方で使う共通表示。
export function AttendedTypeBadge({ attendedType }: AttendedTypeBadgeProps) {
  return (
    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground">
      {ATTENDED_TYPE_LABELS[attendedType]}
    </span>
  );
}
