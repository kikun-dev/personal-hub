"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createReleaseImageRepository } from "@/repositories/releaseImageRepository";
import { updateRelease } from "@/usecases/updateRelease";
import { deleteRelease } from "@/usecases/deleteRelease";
import { uploadReleaseImage } from "@/usecases/uploadReleaseImage";
import { removeReleaseImages } from "@/usecases/removeReleaseImages";
import type { UpdateReleaseInput, ReleaseImageUploadInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

async function cleanupReleaseImages(
  releaseImageRepo: ReturnType<typeof createReleaseImageRepository>,
  imagePaths: Array<string | null | undefined>
): Promise<void> {
  try {
    await removeReleaseImages(releaseImageRepo, imagePaths);
  } catch {
    // 削除失敗は本処理の結果を優先し、後続で手動回収できるようにする
  }
}

export async function updateReleaseAction(
  id: string,
  input: UpdateReleaseInput,
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
    const existing = await repo.findById(id);
    const nextInput: UpdateReleaseInput = { ...input };

    if (imageFile) {
      const uploadResult = await uploadReleaseImage(releaseImageRepo, {
        releaseId: id,
        imageFile,
      });
      if (!uploadResult.ok) {
        return { errors: uploadResult.errors };
      }
      uploadedImagePath = uploadResult.data;
      nextInput.artworkPath = uploadedImagePath;
    }

    const result = await updateRelease(repo, id, nextInput);
    if (!result.ok) {
      await cleanupReleaseImages(releaseImageRepo, [uploadedImagePath]);
      return { errors: result.errors };
    }

    if (existing?.artworkPath && existing.artworkPath !== nextInput.artworkPath) {
      await cleanupReleaseImages(releaseImageRepo, [existing.artworkPath]);
    }
    return {};
  } catch (e) {
    await cleanupReleaseImages(releaseImageRepo, [uploadedImagePath]);
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "リリースが見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteReleaseAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createReleaseRepository(supabase);
  const releaseImageRepo = createReleaseImageRepository(supabase);

  try {
    const existing = await repo.findById(id);
    await deleteRelease(repo, id);
    await cleanupReleaseImages(releaseImageRepo, [existing?.artworkPath]);
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "リリースの削除に失敗しました" };
    }
    throw e;
  }
}
