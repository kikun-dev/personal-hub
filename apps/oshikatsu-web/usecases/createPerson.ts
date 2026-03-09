import type { PersonRepository } from "@/types/repositories";
import type { Person, CreatePersonInput } from "@/types/person";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validatePerson } from "./validatePerson";

export async function createPerson(
  repo: PersonRepository,
  input: CreatePersonInput
): Promise<Result<Person, ValidationError[]>> {
  const errors = validatePerson(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const person = await repo.create(input);
  return { ok: true, data: person };
}
