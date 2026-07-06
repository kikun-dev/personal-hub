import {
  STORAGE_IMAGE_ALLOWED_MIME_TYPES,
  isAllowedStorageImageMimeType,
  isStorageObjectPath,
  getStorageImageExtensionFromMimeType,
  resolveStorageImageSrc,
} from "@/lib/storageImage";

export const MEMBER_IMAGE_BUCKET = "member-images";
export const MEMBER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MEMBER_IMAGE_ALLOWED_MIME_TYPES = STORAGE_IMAGE_ALLOWED_MIME_TYPES;

const MEMBER_IMAGE_PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${MEMBER_IMAGE_BUCKET}/`;

export function isMemberImageStoragePath(value: string): boolean {
  return isStorageObjectPath(value);
}

export function isMemberImageLegacyPublicUrl(value: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const currentProjectUrl = new URL(supabaseUrl);
    const legacyUrl = new URL(value);
    if (legacyUrl.protocol !== "https:") return false;
    if (legacyUrl.hostname !== currentProjectUrl.hostname) return false;
    return legacyUrl.pathname.startsWith(MEMBER_IMAGE_PUBLIC_PATH_PREFIX);
  } catch {
    return false;
  }
}

export function resolveMemberImageSrc(value: string | null): string | null {
  if (!value) return null;
  if (isMemberImageLegacyPublicUrl(value)) return value;
  return resolveStorageImageSrc(value, MEMBER_IMAGE_BUCKET);
}

export function isAllowedMemberImageMimeType(mimeType: string): boolean {
  return isAllowedStorageImageMimeType(mimeType);
}

export function getMemberImageExtensionFromMimeType(mimeType: string): string | null {
  return getStorageImageExtensionFromMimeType(mimeType);
}
