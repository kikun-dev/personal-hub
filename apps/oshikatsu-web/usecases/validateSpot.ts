import type { CreateSpotInput, SpotSourceType } from "@/types/spot";
import { isSpotSourceType } from "@/types/spot";
import type { ValidationError } from "@/types/errors";
import { isValidHttpUrl, isValidUuid } from "@/lib/validation";

// 出典FKフィールド一覧。source_type に対応しないFKが非空のまま送られても
// DB側（055）は全FK列がNULL許容の並列カラムのため弾けないので、usecase側で
// 整合性を担保する。
const FK_FIELDS = ["trackId", "videoId", "eventId", "liveId"] as const;

// 出典種別ごとに対応するFKフィールド（youtube 等の新種別や other は対応FKなし）。
// Record<SpotSourceType, ...> なので SPOT_SOURCE_TYPES に追加した種別を書き漏らすと
// 型エラーで検出される。
const SOURCE_TYPE_FK_FIELD: Record<SpotSourceType, (typeof FK_FIELDS)[number] | null> = {
  mv: "trackId",
  video: "videoId",
  event: "eventId",
  live: "liveId",
  youtube: null,
  lemino: null,
  tv: null,
  nogi_video: null,
  magazine: null,
  photobook: null,
  blog_sns: null,
  other: null,
};

export function validateSpot(input: CreateSpotInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name.trim()) {
    errors.push({ field: "name", message: "スポット名を入力してください" });
  } else if (input.name.length > 100) {
    errors.push({ field: "name", message: "スポット名は100文字以内で入力してください" });
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

  // スポット単一カテゴリを廃止したため、「何の場所か」を表す出来事を
  // 1件以上必須にする（#286）。
  if (input.appearances.length === 0) {
    errors.push({ field: "appearances", message: "出来事を1件以上登録してください" });
  }

  input.appearances.forEach((appearance, index) => {
    if (!isSpotSourceType(appearance.sourceType)) {
      errors.push({
        field: `appearances[${index}].sourceType`,
        message: "出典種別を選択してください",
      });
    } else {
      // 対応するFK自体は空でもよい（実体未登録の出典を許容する）が、
      // 対応しないFKフィールドが非空の場合は指定の食い違いとしてエラーにする。
      const expectedField = SOURCE_TYPE_FK_FIELD[appearance.sourceType];
      const hasMismatchedFk = FK_FIELDS.some(
        (field) => field !== expectedField && appearance[field].trim() !== ""
      );
      if (hasMismatchedFk) {
        errors.push({
          field: `appearances[${index}].sourceType`,
          message: "出典種別と出典の指定が一致していません",
        });
      }
    }

    const groupId = appearance.groupId.trim();
    if (!groupId) {
      errors.push({
        field: `appearances[${index}].groupId`,
        message: "グループを選択してください",
      });
    } else if (!isValidUuid(groupId)) {
      errors.push({
        field: `appearances[${index}].groupId`,
        message: "グループの指定が正しくありません",
      });
    }

    FK_FIELDS.forEach((field) => {
      const value = appearance[field].trim();
      if (value && !isValidUuid(value)) {
        errors.push({
          field: `appearances[${index}].${field}`,
          message: "出典の指定が正しくありません",
        });
      }
    });

    if (appearance.memberIds.some((memberId) => !isValidUuid(memberId))) {
      errors.push({
        field: `appearances[${index}].memberIds`,
        message: "メンバーの指定が正しくありません",
      });
    }

    if (new Set(appearance.memberIds).size !== appearance.memberIds.length) {
      errors.push({
        field: `appearances[${index}].memberIds`,
        message: "メンバーが重複しています",
      });
    }

    if (appearance.subtypeName.trim().length > 50) {
      errors.push({
        field: `appearances[${index}].subtypeName`,
        message: "サブ種別は50文字以内で入力してください",
      });
    }

    if (appearance.note.length > 2000) {
      errors.push({
        field: `appearances[${index}].note`,
        message: "メモは2000文字以内で入力してください",
      });
    }

    if (appearance.linkUrl.trim() && !isValidHttpUrl(appearance.linkUrl.trim())) {
      errors.push({
        field: `appearances[${index}].linkUrl`,
        message: "リンクはURLで入力してください",
      });
    }
  });

  if (input.photos.length > 10) {
    errors.push({ field: "photos", message: "写真は10件以内で登録してください" });
  }

  input.photos.forEach((photo, index) => {
    if (!photo.imagePath.trim()) {
      errors.push({
        field: `photos[${index}].imagePath`,
        message: "画像を指定してください",
      });
    } else if (photo.imagePath.length > 255) {
      errors.push({
        field: `photos[${index}].imagePath`,
        message: "画像パスは255文字以内で入力してください",
      });
    }

    if (photo.caption.length > 200) {
      errors.push({
        field: `photos[${index}].caption`,
        message: "キャプションは200文字以内で入力してください",
      });
    }
  });

  return errors;
}
