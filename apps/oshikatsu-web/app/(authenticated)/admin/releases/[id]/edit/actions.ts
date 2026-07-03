"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createReleaseImageRepository } from "@/repositories/releaseImageRepository";
import { updateRelease } from "@/usecases/updateRelease";
import { deleteRelease } from "@/usecases/deleteRelease";
import { uploadReleaseImage } from "@/usecases/uploadReleaseImage";
import { removeReleaseImages } from "@/usecases/removeReleaseImages";
import { revalidateOrbitReleaseData } from "@/lib/revalidateOrbit";
import type { UpdateReleaseInput, ReleaseImageUploadInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

// 「楽曲は必ず1リリースに紐づく」制約違反（紐づけ解除で孤立する楽曲が出る更新）かを判定する
function isOrphanTrackError(error: RepositoryError): boolean {
  const cause = error.cause as { code?: string; message?: string } | null;
  const message = cause?.message ?? "";
  return (
    cause?.code === "23514" &&
    (message.includes("track must be linked to at least one release") ||
      message.includes("track must have at least one release link"))
  );
}

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
  const supabase = await requireAdmin();

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

    revalidateOrbitReleaseData();
    return {};
  } catch (e) {
    await cleanupReleaseImages(releaseImageRepo, [uploadedImagePath]);
    if (e instanceof RepositoryError) {
      if (isOrphanTrackError(e)) {
        return {
          errors: [
            {
              field: "_form",
              message:
                "この変更では、どのリリースにも紐づかなくなる楽曲があります。対象の楽曲は紐づけを残すか、先に別のリリースへ移してから更新してください。",
            },
          ],
        };
      }
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
  const supabase = await requireAdmin();

  const repo = createReleaseRepository(supabase);
  const releaseImageRepo = createReleaseImageRepository(supabase);

  try {
    const existing = await repo.findById(id);
    await deleteRelease(repo, id);
    await cleanupReleaseImages(releaseImageRepo, [existing?.artworkPath]);
    revalidateOrbitReleaseData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "リリースの削除に失敗しました" };
    }
    throw e;
  }
}
