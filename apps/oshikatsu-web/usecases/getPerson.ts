import type { PersonRepository } from "@/types/repositories";
import type { Person } from "@/types/person";

export async function getPerson(
  repo: PersonRepository,
  id: string
): Promise<Person | null> {
  return repo.findById(id);
}
