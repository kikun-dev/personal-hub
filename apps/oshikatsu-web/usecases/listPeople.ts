import type { PersonRepository } from "@/types/repositories";
import type { Person } from "@/types/person";

export async function listPeople(repo: PersonRepository): Promise<Person[]> {
  return repo.findAll();
}
