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
import { uploadStorageImage } from "@/usecases/uploadStorageImage";

type UploadSpotPhotoInput = {
  imageFile: SpotPhotoUploadInput;
};

export async function uploadSpotPhoto(
  repo: SpotPhotoRepository,
  input: UploadSpotPhotoInput
): Promise<Result<string, ValidationError[]>> {
  return uploadStorageImage(repo, input.imageFile, {
    errorField: "photos",
    maxBytes: SPOT_PHOTO_MAX_BYTES,
    isAllowedMimeType: isAllowedSpotPhotoMimeType,
    getExtensionFromMimeType: getSpotPhotoExtensionFromMimeType,
    buildObjectPath: (extension) => `${SPOT_PHOTO_OBJECT_PREFIX}${randomUUID()}.${extension}`,
  });
}
