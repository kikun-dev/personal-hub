import type { PersonOption } from "@/types/person";
import type { PersonRepository } from "@/types/repositories";

export async function listPersonOptions(
  repo: PersonRepository
): Promise<PersonOption[]> {
  return repo.findOptions();
}
