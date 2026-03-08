export const RELEASE_IMAGE_BUCKET = "release-images";
export const TRACK_COSTUME_IMAGE_BUCKET = "track-costume-images";

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

export function resolveReleaseImageSrc(value: string | null): string | null {
  if (!value) return null;
  if (!isStorageObjectPath(value)) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl}/storage/v1/object/public/${RELEASE_IMAGE_BUCKET}/${encodeStoragePath(value)}`;
}
