"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createReleaseImageRepository } from "@/repositories/releaseImageRepository";
import { createRelease } from "@/usecases/createRelease";
import { uploadReleaseImage } from "@/usecases/uploadReleaseImage";
import { removeReleaseImages } from "@/usecases/removeReleaseImages";
import type { CreateReleaseInput, ReleaseImageUploadInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

async function cleanupUploadedReleaseImage(
  uploadedImagePath: string | null,
  releaseImageRepo: ReturnType<typeof createReleaseImageRepository>
): Promise<void> {
  if (!uploadedImagePath) return;
  try {
    await removeReleaseImages(releaseImageRepo, [uploadedImagePath]);
  } catch {
    // 削除失敗は本処理の結果を優先し、後続で手動回収できるようにする
  }
}

export async function createReleaseAction(
  input: CreateReleaseInput,
  imageFile?: ReleaseImageUploadInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createReleaseRepository(supabase);
  const releaseImageRepo = createReleaseImageRepository(supabase);
  let uploadedImagePath: string | null = null;

  try {
    const nextInput: CreateReleaseInput = { ...input };
    if (imageFile) {
      const uploadResult = await uploadReleaseImage(releaseImageRepo, {
        releaseId: null,
        imageFile,
      });
      if (!uploadResult.ok) {
        return { errors: uploadResult.errors };
      }

      uploadedImagePath = uploadResult.data;
      nextInput.artworkPath = uploadedImagePath;
    }

    const result = await createRelease(repo, nextInput);
    if (!result.ok) {
      await cleanupUploadedReleaseImage(uploadedImagePath, releaseImageRepo);
      return { errors: result.errors };
    }

    return {};
  } catch (e) {
    await cleanupUploadedReleaseImage(uploadedImagePath, releaseImageRepo);
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "リリースの作成に失敗しました" }],
      };
    }
    throw e;
  }
}
