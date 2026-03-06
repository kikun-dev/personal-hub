export const MEMBER_IMAGE_BUCKET = "member-images";
export const MEMBER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MEMBER_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MEMBER_IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
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

export function isMemberImageHttpUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
}

export function isMemberImageStoragePath(value: string): boolean {
  if (!value.trim()) return false;
  if (isMemberImageHttpUrl(value)) return false;
  if (value.startsWith("/")) return false;
  if (value.includes("..")) return false;
  return true;
}

export function resolveMemberImageSrc(value: string | null): string | null {
  if (!value) return null;
  if (isMemberImageHttpUrl(value)) return value;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const encodedPath = encodeStoragePath(value);
  return `${supabaseUrl}/storage/v1/object/public/${MEMBER_IMAGE_BUCKET}/${encodedPath}`;
}

export function isAllowedMemberImageMimeType(mimeType: string): boolean {
  return (MEMBER_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getMemberImageExtensionFromMimeType(mimeType: string): string | null {
  return MEMBER_IMAGE_MIME_TO_EXTENSION[mimeType] ?? null;
}
