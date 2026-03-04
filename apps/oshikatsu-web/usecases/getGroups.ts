import type { GroupRepository } from "@/types/repositories";
import type { Group } from "@/types/group";

export async function getGroups(
  repo: GroupRepository
): Promise<Group[]> {
  return repo.findAll();
}
