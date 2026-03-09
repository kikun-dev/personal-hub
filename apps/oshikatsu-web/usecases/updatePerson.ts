import type { PersonRepository } from "@/types/repositories";
import type { Person, UpdatePersonInput } from "@/types/person";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validatePerson } from "./validatePerson";

export async function updatePerson(
  repo: PersonRepository,
  id: string,
  input: UpdatePersonInput
): Promise<Result<Person, ValidationError[]>> {
  const errors = validatePerson(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const person = await repo.update(id, input);
  return { ok: true, data: person };
}
