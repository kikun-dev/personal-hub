import type { CreateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import { BLOOD_TYPES } from "@/lib/constants";
import { isValidHttpsUrl, isValidDateString } from "@/lib/validation";

export function validateMember(input: CreateMemberInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.nameJa.trim()) {
    errors.push({ field: "nameJa", message: "名前（日本語）を入力してください" });
  } else if (input.nameJa.length > 50) {
    errors.push({ field: "nameJa", message: "名前（日本語）は50文字以内で入力してください" });
  }

  if (!input.nameKana.trim()) {
    errors.push({ field: "nameKana", message: "名前（かな）を入力してください" });
  } else if (input.nameKana.length > 50) {
    errors.push({ field: "nameKana", message: "名前（かな）は50文字以内で入力してください" });
  }

  if (input.nameEn && input.nameEn.length > 100) {
    errors.push({ field: "nameEn", message: "名前（英語）は100文字以内で入力してください" });
  }

  if (input.hometown && input.hometown.length > 100) {
    errors.push({ field: "hometown", message: "出身地は100文字以内で入力してください" });
  }

  if (input.groups.length === 0) {
    errors.push({ field: "groups", message: "1つ以上のグループを選択してください" });
  }

  for (let i = 0; i < input.groups.length; i++) {
    if (!input.groups[i].groupId) {
      errors.push({ field: `groups.${i}.groupId`, message: "グループを選択してください" });
    }
  }

  if (input.heightCm) {
    const h = Number(input.heightCm);
    if (isNaN(h)) {
      errors.push({ field: "heightCm", message: "身長は数値で入力してください" });
    } else if (h <= 0 || h >= 300) {
      errors.push({ field: "heightCm", message: "身長は0〜300cmの範囲で入力してください" });
    }
  }

  if (input.bloodType && !(BLOOD_TYPES as readonly string[]).includes(input.bloodType)) {
    errors.push({ field: "bloodType", message: "血液型はA, B, O, ABから選択してください" });
  }

  if (input.dateOfBirth && !isValidDateString(input.dateOfBirth)) {
    errors.push({ field: "dateOfBirth", message: "生年月日はYYYY-MM-DD形式で入力してください" });
  }

  if (input.imageUrl && !isValidHttpsUrl(input.imageUrl)) {
    errors.push({ field: "imageUrl", message: "画像URLはhttpsで始まる有効なURLを入力してください" });
  }

  if (input.blogUrl && !isValidHttpsUrl(input.blogUrl)) {
    errors.push({ field: "blogUrl", message: "ブログURLはhttpsで始まる有効なURLを入力してください" });
  }

  return errors;
}
