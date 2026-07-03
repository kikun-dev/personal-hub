import type { UpsertAttendanceInput } from "@/types/attendance";
import { isAttendedType } from "@/types/attendance";
import type { ValidationError } from "@/types/errors";
import { isValidUuid } from "@/lib/validation";

// 既存の validate 系（メモ・説明系フィールド）の上限に合わせる（validateLive の note 等）
const MAX_NOTE_LENGTH = 500;

export function validateAttendance(
  input: UpsertAttendanceInput
): ValidationError[] {
  const errors: ValidationError[] = [];

  // performanceId はクライアント入力の境界値（PR #253 レビュー指摘）。
  // RLS/FK があっても、空文字やUUID以外の値を汎用エラーとしてDBまで到達させない。
  if (!input.performanceId || !isValidUuid(input.performanceId)) {
    errors.push({
      field: "performanceId",
      message: "公演を正しく指定してください",
    });
  }

  if (!input.attendedType || !isAttendedType(input.attendedType)) {
    errors.push({
      field: "attendedType",
      message: "参戦種別を選択してください",
    });
  }

  if (input.seatNote.length > MAX_NOTE_LENGTH) {
    errors.push({
      field: "seatNote",
      message: `座席メモは${MAX_NOTE_LENGTH}文字以内で入力してください`,
    });
  }

  if (input.note.length > MAX_NOTE_LENGTH) {
    errors.push({
      field: "note",
      message: `メモは${MAX_NOTE_LENGTH}文字以内で入力してください`,
    });
  }

  return errors;
}
