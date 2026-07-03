export const ATTENDED_TYPE_VALUES = ["onsite", "live_viewing", "streaming"] as const;

export type AttendedType = (typeof ATTENDED_TYPE_VALUES)[number];

export const ATTENDED_TYPE_LABELS: Record<AttendedType, string> = {
  onsite: "現地",
  live_viewing: "ライブビューイング",
  streaming: "配信",
};

export function isAttendedType(value: string): value is AttendedType {
  return (ATTENDED_TYPE_VALUES as readonly string[]).includes(value);
}

// ユーザー別データ（ADR 0009）。user_id は含めない: 常にサーバー側の auth.uid() 由来で
// 扱うため、ドメイン型・入力型のいずれにも持たせない（クライアント入力を信用しない）。
export type LiveAttendance = {
  id: string;
  performanceId: string;
  attendedType: AttendedType;
  seatNote: string | null;
  note: string | null;
};

export type UpsertAttendanceInput = {
  performanceId: string;
  attendedType: AttendedType | "";
  seatNote: string;
  note: string;
};
