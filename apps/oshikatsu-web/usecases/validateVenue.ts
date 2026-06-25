import type { CreateVenueInput } from "@/types/venue";
import type { ValidationError } from "@/types/errors";

export function validateVenue(input: CreateVenueInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name.trim()) {
    errors.push({ field: "name", message: "会場名を入力してください" });
  } else if (input.name.length > 100) {
    errors.push({ field: "name", message: "会場名は100文字以内で入力してください" });
  }

  if (input.prefecture.length > 20) {
    errors.push({ field: "prefecture", message: "都道府県は20文字以内で入力してください" });
  }

  if (input.address.length > 200) {
    errors.push({ field: "address", message: "住所は200文字以内で入力してください" });
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
