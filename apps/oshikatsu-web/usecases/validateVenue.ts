import type { CreateVenueInput } from "@/types/venue";
import type { ValidationError } from "@/types/errors";
import { isValidHttpUrl } from "@/lib/validation";

export function validateVenue(input: CreateVenueInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name.trim()) {
    errors.push({ field: "name", message: "会場名を入力してください" });
  } else if (input.name.length > 100) {
    errors.push({ field: "name", message: "会場名は100文字以内で入力してください" });
  }

  if (input.prefecture.length > 30) {
    errors.push({ field: "prefecture", message: "都道府県・地域は30文字以内で入力してください" });
  }

  if (input.mapUrl.trim() && !isValidHttpUrl(input.mapUrl.trim())) {
    errors.push({ field: "mapUrl", message: "Googleマップのリンクはhttp(s)のURLで入力してください" });
  }

  if (input.officialUrl.trim() && !isValidHttpUrl(input.officialUrl.trim())) {
    errors.push({ field: "officialUrl", message: "公式サイトのリンクはhttp(s)のURLで入力してください" });
  }

  const capacity = input.capacity.trim();
  if (capacity) {
    const parsed = Number(capacity);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push({ field: "capacity", message: "キャパシティは1以上の整数で入力してください" });
    }
  }

  if (input.access.length > 2000) {
    errors.push({ field: "access", message: "交通情報は2000文字以内で入力してください" });
  }

  if (input.notes.length > 2000) {
    errors.push({ field: "notes", message: "メモは2000文字以内で入力してください" });
  }

  return errors;
}
