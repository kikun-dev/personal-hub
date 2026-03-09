import { randomUUID } from "crypto";
import type { ReleaseImageUploadInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import type { ReleaseImageRepository } from "@/types/repositories";
import {
  RELEASE_IMAGE_MAX_BYTES,
  getReleaseImageExtensionFromMimeType,
  isAllowedReleaseImageMimeType,
} from "@/lib/releaseImage";

type UploadReleaseImageInput = {
  releaseId: string | null;
  imageFile: ReleaseImageUploadInput;
};

function decodeBase64(data: string): Uint8Array | null {
  try {
    const buffer = Buffer.from(data, "base64");
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function uploadReleaseImage(
  repo: ReleaseImageRepository,
  input: UploadReleaseImageInput
): Promise<Result<string, ValidationError[]>> {
  if (!isAllowedReleaseImageMimeType(input.imageFile.mimeType)) {
    return {
      ok: false,
      errors: [{ field: "artworkPath", message: "画像形式が不正です" }],
    };
  }

  if (input.imageFile.size <= 0 || input.imageFile.size > RELEASE_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      errors: [{ field: "artworkPath", message: "画像サイズが不正です" }],
    };
  }

  const extension = getReleaseImageExtensionFromMimeType(input.imageFile.mimeType);
  if (!extension) {
    return {
      ok: false,
      errors: [{ field: "artworkPath", message: "画像形式が不正です" }],
    };
  }

  const body = decodeBase64(input.imageFile.base64Data);
  if (!body || body.byteLength !== input.imageFile.size) {
    return {
      ok: false,
      errors: [{ field: "artworkPath", message: "画像データが不正です" }],
    };
  }

  const keyPrefix = input.releaseId ? `releases/${input.releaseId}` : "releases/new";
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
