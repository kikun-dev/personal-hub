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
import { uploadStorageImage } from "@/usecases/uploadStorageImage";

type UploadReleaseImageInput = {
  releaseId: string | null;
  imageFile: ReleaseImageUploadInput;
};

export async function uploadReleaseImage(
  repo: ReleaseImageRepository,
  input: UploadReleaseImageInput
): Promise<Result<string, ValidationError[]>> {
  return uploadStorageImage(repo, input.imageFile, {
    errorField: "artworkPath",
    maxBytes: RELEASE_IMAGE_MAX_BYTES,
    isAllowedMimeType: isAllowedReleaseImageMimeType,
    getExtensionFromMimeType: getReleaseImageExtensionFromMimeType,
    buildObjectPath: (extension) => {
      const keyPrefix = input.releaseId ? `releases/${input.releaseId}` : "releases/new";
      return `${keyPrefix}/${Date.now()}-${randomUUID()}.${extension}`;
    },
  });
}
