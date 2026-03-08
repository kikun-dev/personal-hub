import type { CreateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";
import { isValidHttpUrl, isValidDateString } from "@/lib/validation";

export function validateEvent(input: CreateEventInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.title.trim()) {
    errors.push({ field: "title", message: "タイトルを入力してください" });
  } else if (input.title.length > 200) {
    errors.push({ field: "title", message: "タイトルは200文字以内で入力してください" });
  }

  if (input.description && input.description.length > 2000) {
    errors.push({ field: "description", message: "説明は2000文字以内で入力してください" });
  }

  if (!input.eventTypeId) {
    errors.push({ field: "eventTypeId", message: "イベント種別を選択してください" });
  }

  if (!input.date) {
    errors.push({ field: "date", message: "日付を選択してください" });
  } else if (!isValidDateString(input.date)) {
    errors.push({ field: "date", message: "日付はYYYY-MM-DD形式で入力してください" });
  }

  if (input.endDate && !isValidDateString(input.endDate)) {
    errors.push({ field: "endDate", message: "終了日はYYYY-MM-DD形式で入力してください" });
  } else if (input.endDate && input.date && input.endDate < input.date) {
    errors.push({ field: "endDate", message: "終了日は開始日以降の日付を選択してください" });
  }

  if (input.venue && input.venue.length > 200) {
    errors.push({ field: "venue", message: "会場は200文字以内で入力してください" });
  }

  if (input.url && !isValidHttpUrl(input.url)) {
    errors.push({ field: "url", message: "URLはhttp(s)で始まる有効なURLを入力してください" });
  }

  if (input.groupIds.length === 0) {
    errors.push({ field: "groupIds", message: "1つ以上のグループを選択してください" });
  }

  if (input.isMemberHistory && input.memberIds.length === 0) {
    errors.push({ field: "memberIds", message: "来歴として保存する場合は1人以上のメンバーを選択してください" });
  }

  return errors;
}
