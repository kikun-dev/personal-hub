import type { CreateSpotInput } from "@/types/spot";
import { isSpotCategory, isSpotSourceType } from "@/types/spot";
import type { ValidationError } from "@/types/errors";
import { isValidHttpUrl, isValidDateString } from "@/lib/validation";

export function validateSpot(input: CreateSpotInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name.trim()) {
    errors.push({ field: "name", message: "スポット名を入力してください" });
  } else if (input.name.length > 100) {
    errors.push({ field: "name", message: "スポット名は100文字以内で入力してください" });
  }

  if (!isSpotCategory(input.category)) {
    errors.push({ field: "category", message: "カテゴリを選択してください" });
  }

  const latitude = input.latitude.trim();
  if (!latitude) {
    errors.push({ field: "latitude", message: "緯度を入力してください" });
  } else {
    const parsed = Number(latitude);
    if (Number.isNaN(parsed) || parsed < -90 || parsed > 90) {
      errors.push({ field: "latitude", message: "緯度は-90〜90の数値で入力してください" });
    }
  }

  const longitude = input.longitude.trim();
  if (!longitude) {
    errors.push({ field: "longitude", message: "経度を入力してください" });
  } else {
    const parsed = Number(longitude);
    if (Number.isNaN(parsed) || parsed < -180 || parsed > 180) {
      errors.push({ field: "longitude", message: "経度は-180〜180の数値で入力してください" });
    }
  }

  if (input.description.length > 2000) {
    errors.push({ field: "description", message: "説明は2000文字以内で入力してください" });
  }

  if (input.address.length > 200) {
    errors.push({ field: "address", message: "住所は200文字以内で入力してください" });
  }

  if (input.prefecture.length > 30) {
    errors.push({ field: "prefecture", message: "都道府県は30文字以内で入力してください" });
  }

  if (input.googleMapsUrl.trim() && !isValidHttpUrl(input.googleMapsUrl.trim())) {
    errors.push({
      field: "googleMapsUrl",
      message: "GoogleマップのリンクはURLで入力してください",
    });
  }

  input.appearances.forEach((appearance, index) => {
    if (!isSpotSourceType(appearance.sourceType)) {
      errors.push({
        field: `appearances[${index}].sourceType`,
        message: "出典種別を選択してください",
      });
    }

    if (appearance.seriesName.length > 100) {
      errors.push({
        field: `appearances[${index}].seriesName`,
        message: "シリーズ名は100文字以内で入力してください",
      });
    }

    if (appearance.note.length > 2000) {
      errors.push({
        field: `appearances[${index}].note`,
        message: "メモは2000文字以内で入力してください",
      });
    }

    const appearedOn = appearance.appearedOn.trim();
    if (appearedOn && !isValidDateString(appearedOn)) {
      errors.push({
        field: `appearances[${index}].appearedOn`,
        message: "訪問日はYYYY-MM-DD形式で入力してください",
      });
    }

    if (appearance.linkUrl.trim() && !isValidHttpUrl(appearance.linkUrl.trim())) {
      errors.push({
        field: `appearances[${index}].linkUrl`,
        message: "リンクはURLで入力してください",
      });
    }
  });

  return errors;
}
