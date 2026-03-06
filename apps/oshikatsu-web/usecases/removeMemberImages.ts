import type { MemberImageRepository } from "@/types/repositories";
import { isMemberImageStoragePath } from "@/lib/memberImage";

export async function removeMemberImages(
  repo: MemberImageRepository,
  imagePaths: Array<string | null | undefined>
): Promise<void> {
  const isStoragePath = (path: string | null | undefined): path is string =>
    typeof path === "string" && isMemberImageStoragePath(path);

  const targets = Array.from(
    new Set(
      imagePaths.filter(isStoragePath)
    )
  );

  if (targets.length === 0) return;
  await repo.remove(targets);
}
