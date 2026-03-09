import type { CreatePersonInput } from "@/types/person";
import type { ValidationError } from "@/types/errors";
import { PERSON_ROLE_VALUES } from "@/types/person";
import { isValidDateString } from "@/lib/validation";

function isPersonRole(value: string): boolean {
  return (PERSON_ROLE_VALUES as readonly string[]).includes(value);
}

export function validatePerson(input: CreatePersonInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.displayName.trim()) {
    errors.push({ field: "displayName", message: "名前を入力してください" });
  } else if (input.displayName.length > 100) {
    errors.push({ field: "displayName", message: "名前は100文字以内で入力してください" });
  }

  if (input.dateOfBirth && !isValidDateString(input.dateOfBirth)) {
    errors.push({ field: "dateOfBirth", message: "生年月日はYYYY-MM-DD形式で入力してください" });
  }

  if (input.roles.length === 0) {
    errors.push({ field: "roles", message: "担当を1つ以上選択してください" });
  }

  const seenRoles = new Set<string>();
  for (const role of input.roles) {
    if (!isPersonRole(role)) {
      errors.push({ field: "roles", message: "無効な担当が含まれています" });
      break;
    }
    if (seenRoles.has(role)) {
      errors.push({ field: "roles", message: "同じ担当が重複しています" });
      break;
    }
    seenRoles.add(role);
  }

  if (input.biography.length > 2000) {
    errors.push({ field: "biography", message: "略歴は2000文字以内で入力してください" });
  }

  return errors;
}
