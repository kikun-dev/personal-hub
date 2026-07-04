import type { PersonRepository } from "@/types/repositories";
import type { PersonListItem } from "@/types/person";

export async function listPeople(
  repo: PersonRepository
): Promise<PersonListItem[]> {
  return repo.findAll();
}
