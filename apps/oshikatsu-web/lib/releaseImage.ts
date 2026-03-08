export const RELEASE_IMAGE_BUCKET = "release-images";
export const TRACK_COSTUME_IMAGE_BUCKET = "track-costume-images";

export function isStorageObjectPath(value: string): boolean {
  if (!value.trim()) return false;
  if (/^https:\/\//i.test(value)) return false;
  if (value.startsWith("/")) return false;
  if (value.includes("..")) return false;
  return true;
}
