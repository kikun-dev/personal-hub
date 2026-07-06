import {
  STORAGE_IMAGE_ALLOWED_MIME_TYPES,
  isAllowedStorageImageMimeType,
  isStorageObjectPath,
  getStorageImageExtensionFromMimeType,
  resolveStorageImageSrc,
} from "@/lib/storageImage";

export const SPOT_PHOTO_BUCKET = "spot-photos";
export const SPOT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
// 1スポットあたりの写真上限（フォームUI・バリデーションの共通ソース）
export const SPOT_PHOTO_MAX_COUNT = 10;
export const SPOT_PHOTO_ALLOWED_MIME_TYPES = STORAGE_IMAGE_ALLOWED_MIME_TYPES;

// Storage バケットは常に "spots/" prefix 配下に置く（migration 058 のポリシーと一致）。
// スポットIDに紐付けない（object path はスポット非依存の一意UUID）ため、
// メンバー画像のような `members/{id}/...` ネストは不要。
export const SPOT_PHOTO_OBJECT_PREFIX = "spots/";

export function isSpotPhotoStoragePath(value: string): boolean {
  // アップロード（uploadSpotPhoto）が生成するパスは必ずこの prefix 配下
  // （migration 058 のポリシーとも一致）。prefix 外のパスを弾くことで、
  // 改ざんされた imagePath の保存や、孤児掃除での意図しない削除を防ぐ。
  return isStorageObjectPath(value, SPOT_PHOTO_OBJECT_PREFIX);
}

export function resolveSpotPhotoSrc(value: string | null): string | null {
  return resolveStorageImageSrc(value, SPOT_PHOTO_BUCKET, SPOT_PHOTO_OBJECT_PREFIX);
}

export function isAllowedSpotPhotoMimeType(mimeType: string): boolean {
  return isAllowedStorageImageMimeType(mimeType);
}

export function getSpotPhotoExtensionFromMimeType(mimeType: string): string | null {
  return getStorageImageExtensionFromMimeType(mimeType);
}
