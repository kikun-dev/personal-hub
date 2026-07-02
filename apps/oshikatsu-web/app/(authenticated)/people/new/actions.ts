"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createPersonRepository } from "@/repositories/personRepository";
import { revalidateOrbitPersonData } from "@/lib/revalidateOrbit";
import { createPerson } from "@/usecases/createPerson";
import type { CreatePersonInput } from "@/types/person";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function createPersonAction(
  input: CreatePersonInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createPersonRepository(supabase);

  try {
    const result = await createPerson(repo, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitPersonData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "制作陣の作成に失敗しました" }],
      };
    }
    throw e;
  }
}
