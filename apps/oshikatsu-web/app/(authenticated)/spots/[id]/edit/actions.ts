"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createSpotRepository } from "@/repositories/spotRepository";
import { createSpotPhotoRepository } from "@/repositories/spotPhotoRepository";
import { revalidateOrbitSpotData } from "@/lib/revalidateOrbit";
import { updateSpot } from "@/usecases/updateSpot";
import { deleteSpot } from "@/usecases/deleteSpot";
import { removeSpotPhotos } from "@/usecases/removeSpotPhotos";
import type { UpdateSpotInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

async function cleanupSpotPhotos(
  spotPhotoRepo: ReturnType<typeof createSpotPhotoRepository>,
  imagePaths: Array<string | null | undefined>
): Promise<void> {
  try {
    await removeSpotPhotos(spotPhotoRepo, imagePaths);
  } catch {
    // 削除失敗は本処理の結果を優先し、後続で手動回収できるようにする
  }
}

export async function updateSpotAction(
  id: string,
  input: UpdateSpotInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createSpotRepository(supabase);
  const spotPhotoRepo = createSpotPhotoRepository(supabase);

  try {
    // 更新前の写真パスを控えておき、更新成功後に「新しい入力に無くなったもの」を
    // Storage から掃除する（DB書き込み優先。Storage削除の失敗は致命傷にしない）。
    const existing = await repo.findById(id);
    const oldImagePaths = existing?.photos.map((photo) => photo.imagePath) ?? [];

    const result = await updateSpot(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    const nextImagePaths = new Set(input.photos.map((photo) => photo.imagePath));
    const orphanedImagePaths = oldImagePaths.filter((path) => !nextImagePaths.has(path));
    if (orphanedImagePaths.length > 0) {
      await cleanupSpotPhotos(spotPhotoRepo, orphanedImagePaths);
    }

    revalidateOrbitSpotData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "スポットが見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteSpotAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();

  const repo = createSpotRepository(supabase);
  const spotPhotoRepo = createSpotPhotoRepository(supabase);

  try {
    const existing = await repo.findById(id);
    await deleteSpot(repo, id);

    const imagePaths = existing?.photos.map((photo) => photo.imagePath) ?? [];
    if (imagePaths.length > 0) {
      await cleanupSpotPhotos(spotPhotoRepo, imagePaths);
    }

    revalidateOrbitSpotData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "スポットの削除に失敗しました" };
    }
    throw e;
  }
}
