import type { SpotPhotoRepository } from "@/types/repositories";
import { isSpotPhotoStoragePath } from "@/lib/spotPhoto";

export async function removeSpotPhotos(
  repo: SpotPhotoRepository,
  imagePaths: Array<string | null | undefined>
): Promise<void> {
  const isStoragePath = (path: string | null | undefined): path is string =>
    typeof path === "string" && isSpotPhotoStoragePath(path);

  const targets = Array.from(
    new Set(
      imagePaths.filter(isStoragePath)
    )
  );

  if (targets.length === 0) return;
  await repo.remove(targets);
}
