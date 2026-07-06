/**
 * member / release / spot の画像アップロード基盤（lib ヘルパー）の共通コア。
 * mime 許可リスト・拡張子マップ・object path 検証・public URL 解決という
 * 3系統でほぼ逐語一致していたロジックをここに集約する（Issue #298）。
 *
 * ドメイン固有の差分（member の legacy public URL 互換、release の
 * costume 画像バケット分岐、spot の `spots/` prefix 必須化）は
 * それぞれ `lib/memberImage.ts` / `lib/releaseImage.ts` / `lib/spotPhoto.ts` に残し、
 * このファイルはドメイン非依存の部分のみを持つ。
 */

export const STORAGE_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const STORAGE_IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function encodeStorageObjectPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Storage の object path として妥当かどうかを検証する。
 * `requiredPrefix` を渡すと、その prefix 配下のパスのみを許可する（spot 用）。
 */
export function isStorageObjectPath(value: string, requiredPrefix?: string): boolean {
  if (!value.trim()) return false;
  if (/^https:\/\//i.test(value)) return false;
  if (value.startsWith("/")) return false;
  if (value.includes("..")) return false;
  if (requiredPrefix && !value.startsWith(requiredPrefix)) return false;
  return true;
}

export function resolveStorageImageSrc(
  value: string | null,
  bucket: string,
  requiredPrefix?: string
): string | null {
  if (!value) return null;
  if (!isStorageObjectPath(value, requiredPrefix)) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const encodedPath = encodeStorageObjectPath(value);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function isAllowedStorageImageMimeType(mimeType: string): boolean {
  return (STORAGE_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getStorageImageExtensionFromMimeType(mimeType: string): string | null {
  return STORAGE_IMAGE_MIME_TO_EXTENSION[mimeType] ?? null;
}
