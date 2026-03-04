import type { CreateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";

export function validateMember(input: CreateMemberInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.nameJa.trim()) {
    errors.push({ field: "nameJa", message: "名前（日本語）を入力してください" });
  }

  if (!input.nameKana.trim()) {
    errors.push({ field: "nameKana", message: "名前（かな）を入力してください" });
  }

  if (input.groups.length === 0) {
    errors.push({ field: "groups", message: "1つ以上のグループを選択してください" });
  }

  for (let i = 0; i < input.groups.length; i++) {
    if (!input.groups[i].groupId) {
      errors.push({ field: `groups.${i}.groupId`, message: "グループを選択してください" });
    }
  }

  if (input.heightCm && isNaN(Number(input.heightCm))) {
    errors.push({ field: "heightCm", message: "身長は数値で入力してください" });
  }

  return errors;
}
