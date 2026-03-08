import type { CreateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import {
  BLOOD_TYPES,
  SNS_TYPES,
  type BloodType,
  type SnsType,
} from "@/lib/constants";
import {
  isValidHttpsUrl,
  isValidDateString,
  isValidHashtag,
} from "@/lib/validation";
import {
  isMemberImageLegacyPublicUrl,
  isMemberImageStoragePath,
} from "@/lib/memberImage";

function isBloodType(value: string): value is BloodType {
  return (BLOOD_TYPES as readonly string[]).includes(value);
}

function isSnsType(value: string): value is SnsType {
  return (SNS_TYPES as readonly { value: string }[]).some((type) => type.value === value);
}

function isValidHeightCm(value: string): boolean {
  return /^\d+(?:\.\d)?$/.test(value);
}

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

  if (input.callName && input.callName.length > 100) {
    errors.push({ field: "callName", message: "コール名は100文字以内で入力してください" });
  }

  if (input.hometown && input.hometown.length > 100) {
    errors.push({ field: "hometown", message: "出身地は100文字以内で入力してください" });
  }

  if (input.memo && input.memo.length > 500) {
    errors.push({ field: "memo", message: "メモは500文字以内で入力してください" });
  }

  const hasPenlightColor1 = input.penlightColor1.trim().length > 0;
  const hasPenlightColor2 = input.penlightColor2.trim().length > 0;
  if (hasPenlightColor1 !== hasPenlightColor2) {
    errors.push({
      field: "penlightColor1",
      message: "サイリウムカラーは2色セットで入力するか、未入力にしてください",
    });
    errors.push({
      field: "penlightColor2",
      message: "サイリウムカラーは2色セットで入力するか、未入力にしてください",
    });
  }

  if (input.groups.length === 0) {
    errors.push({ field: "groups", message: "1つ以上のグループを選択してください" });
  }

  for (let i = 0; i < input.groups.length; i++) {
    const group = input.groups[i];
    if (!group.groupId) {
      errors.push({ field: `groups.${i}.groupId`, message: "グループを選択してください" });
    }

    if (group.generation) {
      const generation = Number(group.generation);
      if (!Number.isInteger(generation) || generation <= 0 || generation > 50) {
        errors.push({ field: `groups.${i}.generation`, message: "期生は1〜50の整数で選択してください" });
      }
    }
  }

  const heightCm = input.heightCm.trim();
  if (heightCm) {
    if (!isValidHeightCm(heightCm)) {
      errors.push({ field: "heightCm", message: "身長は数値（小数1桁まで）で入力してください" });
    } else {
      const h = Number(heightCm);
      if (h <= 0 || h >= 300) {
        errors.push({ field: "heightCm", message: "身長は0より大きく300未満の値で入力してください" });
      }
    }
  }

  if (input.bloodType && !isBloodType(input.bloodType)) {
    errors.push({ field: "bloodType", message: "血液型はA, B, O, AB, 不明から選択してください" });
  }

  if (input.dateOfBirth && !isValidDateString(input.dateOfBirth)) {
    errors.push({ field: "dateOfBirth", message: "生年月日はYYYY-MM-DD形式で入力してください" });
  }

  if (
    input.imageUrl &&
    !isMemberImageStoragePath(input.imageUrl) &&
    !isMemberImageLegacyPublicUrl(input.imageUrl)
  ) {
    errors.push({
      field: "imageUrl",
      message: "画像はStorageパスまたは旧Supabase公開URLを指定してください",
    });
  }

  if (input.blogUrl && !isValidHttpsUrl(input.blogUrl)) {
    errors.push({ field: "blogUrl", message: "ブログURLはhttpsで始まる有効なURLを入力してください" });
  }
  if (input.blogHashtag && !isValidHashtag(input.blogHashtag)) {
    errors.push({ field: "blogHashtag", message: "ブログのハッシュタグは#から始めて入力してください" });
  }

  if (input.talkAppName && input.talkAppName.length > 100) {
    errors.push({ field: "talkAppName", message: "トークアプリ名は100文字以内で入力してください" });
  }
  if (input.talkAppUrl && !isValidHttpsUrl(input.talkAppUrl)) {
    errors.push({ field: "talkAppUrl", message: "トークアプリURLはhttpsで始まる有効なURLを入力してください" });
  }
  if (input.talkAppHashtag && !isValidHashtag(input.talkAppHashtag)) {
    errors.push({ field: "talkAppHashtag", message: "トークアプリのハッシュタグは#から始めて入力してください" });
  }

  for (let i = 0; i < input.sns.length; i++) {
    const sns = input.sns[i];
    if (!sns.snsType) {
      errors.push({ field: `sns.${i}.snsType`, message: "SNS種別を選択してください" });
    } else if (!isSnsType(sns.snsType)) {
      errors.push({ field: `sns.${i}.snsType`, message: "無効なSNS種別です" });
    }

    if (!sns.displayName.trim()) {
      errors.push({ field: `sns.${i}.displayName`, message: "SNS表示名を入力してください" });
    } else if (sns.displayName.length > 100) {
      errors.push({ field: `sns.${i}.displayName`, message: "SNS表示名は100文字以内で入力してください" });
    }

    if (!sns.url.trim()) {
      errors.push({ field: `sns.${i}.url`, message: "SNS URLを入力してください" });
    } else if (!isValidHttpsUrl(sns.url)) {
      errors.push({ field: `sns.${i}.url`, message: "SNS URLはhttpsで始まる有効なURLを入力してください" });
    }

    if (sns.hashtag && !isValidHashtag(sns.hashtag)) {
      errors.push({ field: `sns.${i}.hashtag`, message: "SNSハッシュタグは#から始めて入力してください" });
    }
  }

  return errors;
}
