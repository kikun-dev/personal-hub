import type { ReleaseImageRepository } from "@/types/repositories";
import { isReleaseArtworkPath } from "@/lib/releaseImage";

export async function removeReleaseImages(
  repo: ReleaseImageRepository,
  imagePaths: Array<string | null | undefined>
): Promise<void> {
  const isStoragePath = (path: string | null | undefined): path is string =>
    typeof path === "string" && isReleaseArtworkPath(path);

  const targets = Array.from(new Set(imagePaths.filter(isStoragePath)));

  if (targets.length === 0) return;
  await repo.remove(targets);
}
