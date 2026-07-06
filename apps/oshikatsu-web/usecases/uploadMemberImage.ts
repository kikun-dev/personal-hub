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
import { uploadStorageImage } from "@/usecases/uploadStorageImage";

type UploadMemberImageInput = {
  memberId: string | null;
  imageFile: MemberImageUploadInput;
};

export async function uploadMemberImage(
  repo: MemberImageRepository,
  input: UploadMemberImageInput
): Promise<Result<string, ValidationError[]>> {
  return uploadStorageImage(repo, input.imageFile, {
    errorField: "imageUrl",
    maxBytes: MEMBER_IMAGE_MAX_BYTES,
    isAllowedMimeType: isAllowedMemberImageMimeType,
    getExtensionFromMimeType: getMemberImageExtensionFromMimeType,
    buildObjectPath: (extension) => {
      const keyPrefix = input.memberId ? `members/${input.memberId}` : "members/new";
      return `${keyPrefix}/${Date.now()}-${randomUUID()}.${extension}`;
    },
  });
}
