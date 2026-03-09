import type { PersonRepository } from "@/types/repositories";

export async function deletePerson(
  repo: PersonRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
