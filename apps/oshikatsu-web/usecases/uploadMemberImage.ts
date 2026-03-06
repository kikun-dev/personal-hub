import { randomUUID } from "crypto";
import type { MemberImageUploadInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import type { MemberImageRepository } from "@/types/repositories";
import {
  MEMBER_IMAGE_MAX_BYTES,
  getMemberImageExtensionFromMimeType,
  isAllowedMemberImageMimeType,
} from "@/lib/memberImage";

type UploadMemberImageInput = {
  memberId: string | null;
  imageFile: MemberImageUploadInput;
};

function decodeBase64(data: string): Uint8Array | null {
  try {
    const buffer = Buffer.from(data, "base64");
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function uploadMemberImage(
  repo: MemberImageRepository,
  input: UploadMemberImageInput
): Promise<Result<string, ValidationError[]>> {
  if (!isAllowedMemberImageMimeType(input.imageFile.mimeType)) {
    return {
      ok: false,
      errors: [{ field: "imageUrl", message: "画像形式が不正です" }],
    };
  }

  if (input.imageFile.size <= 0 || input.imageFile.size > MEMBER_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      errors: [{ field: "imageUrl", message: "画像サイズが不正です" }],
    };
  }

  const extension = getMemberImageExtensionFromMimeType(input.imageFile.mimeType);
  if (!extension) {
    return {
      ok: false,
      errors: [{ field: "imageUrl", message: "画像形式が不正です" }],
    };
  }

  const body = decodeBase64(input.imageFile.base64Data);
  if (!body || body.byteLength !== input.imageFile.size) {
    return {
      ok: false,
      errors: [{ field: "imageUrl", message: "画像データが不正です" }],
    };
  }

  const keyPrefix = input.memberId ? `members/${input.memberId}` : "members/new";
  const objectPath = `${keyPrefix}/${Date.now()}-${randomUUID()}.${extension}`;

  await repo.upload({
    objectPath,
    body,
    contentType: input.imageFile.mimeType,
    cacheControl: "31536000",
    upsert: false,
  });

  return { ok: true, data: objectPath };
}
