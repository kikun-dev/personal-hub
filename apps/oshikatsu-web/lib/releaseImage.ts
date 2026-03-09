export const RELEASE_IMAGE_BUCKET = "release-images";
export const TRACK_COSTUME_IMAGE_BUCKET = "track-costume-images";
export const RELEASE_IMAGE_PATH_PREFIX = "releases/";
export const TRACK_COSTUME_IMAGE_PATH_PREFIX = "costumes/";
export const RELEASE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const RELEASE_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const RELEASE_IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function isStorageObjectPath(value: string): boolean {
  if (!value.trim()) return false;
  if (/^https:\/\//i.test(value)) return false;
  if (value.startsWith("/")) return false;
  if (value.includes("..")) return false;
  return true;
}

export function isReleaseArtworkPath(value: string): boolean {
  return isStorageObjectPath(value) && value.startsWith(RELEASE_IMAGE_PATH_PREFIX);
}

export function isTrackCostumeImagePath(value: string): boolean {
  return isStorageObjectPath(value) && value.startsWith(TRACK_COSTUME_IMAGE_PATH_PREFIX);
}

export function resolveReleaseImageSrc(value: string | null): string | null {
  if (!value) return null;
  if (!isStorageObjectPath(value)) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl}/storage/v1/object/public/${RELEASE_IMAGE_BUCKET}/${encodeStoragePath(value)}`;
}

export function isAllowedReleaseImageMimeType(mimeType: string): boolean {
  return (RELEASE_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getReleaseImageExtensionFromMimeType(mimeType: string): string | null {
  return RELEASE_IMAGE_MIME_TO_EXTENSION[mimeType] ?? null;
}
