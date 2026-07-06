export const SPOT_PHOTO_BUCKET = "spot-photos";
export const SPOT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
// 1スポットあたりの写真上限（フォームUI・バリデーションの共通ソース）
export const SPOT_PHOTO_MAX_COUNT = 10;
export const SPOT_PHOTO_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const SPOT_PHOTO_MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Storage バケットは常に "spots/" prefix 配下に置く（migration 058 のポリシーと一致）。
// スポットIDに紐付けない（object path はスポット非依存の一意UUID）ため、
// メンバー画像のような `members/{id}/...` ネストは不要。
export const SPOT_PHOTO_OBJECT_PREFIX = "spots/";

export function isSpotPhotoStoragePath(value: string): boolean {
  if (!value.trim()) return false;
  if (/^https:\/\//i.test(value)) return false;
  if (value.includes("..")) return false;
  // アップロード（uploadSpotPhoto）が生成するパスは必ずこの prefix 配下
  // （migration 058 のポリシーとも一致）。prefix 外のパスを弾くことで、
  // 改ざんされた imagePath の保存や、孤児掃除での意図しない削除を防ぐ。
  return value.startsWith(SPOT_PHOTO_OBJECT_PREFIX);
}

function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function resolveSpotPhotoSrc(value: string | null): string | null {
  if (!value) return null;
  if (!isSpotPhotoStoragePath(value)) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const encodedPath = encodeStoragePath(value);
  return `${supabaseUrl}/storage/v1/object/public/${SPOT_PHOTO_BUCKET}/${encodedPath}`;
}

export function isAllowedSpotPhotoMimeType(mimeType: string): boolean {
  return (SPOT_PHOTO_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getSpotPhotoExtensionFromMimeType(mimeType: string): string | null {
  return SPOT_PHOTO_MIME_TO_EXTENSION[mimeType] ?? null;
}
