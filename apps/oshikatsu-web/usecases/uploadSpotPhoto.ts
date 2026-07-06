import { randomUUID } from "crypto";
import type { SpotPhotoUploadInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import type { SpotPhotoRepository } from "@/types/repositories";
import {
  SPOT_PHOTO_MAX_BYTES,
  SPOT_PHOTO_OBJECT_PREFIX,
  getSpotPhotoExtensionFromMimeType,
  isAllowedSpotPhotoMimeType,
} from "@/lib/spotPhoto";

type UploadSpotPhotoInput = {
  imageFile: SpotPhotoUploadInput;
};

function decodeBase64(data: string): Uint8Array | null {
  try {
    const buffer = Buffer.from(data, "base64");
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function uploadSpotPhoto(
  repo: SpotPhotoRepository,
  input: UploadSpotPhotoInput
): Promise<Result<string, ValidationError[]>> {
  if (!isAllowedSpotPhotoMimeType(input.imageFile.mimeType)) {
    return {
      ok: false,
      errors: [{ field: "photos", message: "画像形式が不正です" }],
    };
  }

  if (input.imageFile.size <= 0 || input.imageFile.size > SPOT_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      errors: [{ field: "photos", message: "画像サイズが不正です" }],
    };
  }

  const extension = getSpotPhotoExtensionFromMimeType(input.imageFile.mimeType);
  if (!extension) {
    return {
      ok: false,
      errors: [{ field: "photos", message: "画像形式が不正です" }],
    };
  }

  const body = decodeBase64(input.imageFile.base64Data);
  if (!body || body.byteLength !== input.imageFile.size) {
    return {
      ok: false,
      errors: [{ field: "photos", message: "画像データが不正です" }],
    };
  }

  const objectPath = `${SPOT_PHOTO_OBJECT_PREFIX}${randomUUID()}.${extension}`;

  await repo.upload({
    objectPath,
    body,
    contentType: input.imageFile.mimeType,
    cacheControl: "31536000",
    upsert: false,
  });

  return { ok: true, data: objectPath };
}
