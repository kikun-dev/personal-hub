import type { CreateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";

export function validateEvent(input: CreateEventInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.title.trim()) {
    errors.push({ field: "title", message: "タイトルを入力してください" });
  }

  if (!input.eventTypeId) {
    errors.push({ field: "eventTypeId", message: "イベント種別を選択してください" });
  }

  if (!input.date) {
    errors.push({ field: "date", message: "日付を選択してください" });
  }

  if (input.groupIds.length === 0) {
    errors.push({ field: "groupIds", message: "1つ以上のグループを選択してください" });
  }

  return errors;
}
