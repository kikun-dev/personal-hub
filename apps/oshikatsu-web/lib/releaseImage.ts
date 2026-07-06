import {
  STORAGE_IMAGE_ALLOWED_MIME_TYPES,
  isAllowedStorageImageMimeType,
  isStorageObjectPath,
  getStorageImageExtensionFromMimeType,
  resolveStorageImageSrc,
} from "@/lib/storageImage";

export const RELEASE_IMAGE_BUCKET = "release-images";
export const TRACK_COSTUME_IMAGE_BUCKET = "track-costume-images";
export const RELEASE_IMAGE_PATH_PREFIX = "releases/";
export const TRACK_COSTUME_IMAGE_PATH_PREFIX = "costumes/";
export const RELEASE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const RELEASE_IMAGE_ALLOWED_MIME_TYPES = STORAGE_IMAGE_ALLOWED_MIME_TYPES;

export { isStorageObjectPath };

export function isReleaseArtworkPath(value: string): boolean {
  return isStorageObjectPath(value) && value.startsWith(RELEASE_IMAGE_PATH_PREFIX);
}

export function isTrackCostumeImagePath(value: string): boolean {
  return isStorageObjectPath(value) && value.startsWith(TRACK_COSTUME_IMAGE_PATH_PREFIX);
}

export function resolveReleaseImageSrc(value: string | null): string | null {
  return resolveStorageImageSrc(value, RELEASE_IMAGE_BUCKET);
}

export function isAllowedReleaseImageMimeType(mimeType: string): boolean {
  return isAllowedStorageImageMimeType(mimeType);
}

export function getReleaseImageExtensionFromMimeType(mimeType: string): string | null {
  return getStorageImageExtensionFromMimeType(mimeType);
}
