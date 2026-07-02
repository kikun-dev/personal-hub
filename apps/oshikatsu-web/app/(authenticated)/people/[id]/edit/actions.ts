"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createPersonRepository } from "@/repositories/personRepository";
import { revalidateOrbitPersonData } from "@/lib/revalidateOrbit";
import { updatePerson } from "@/usecases/updatePerson";
import { deletePerson } from "@/usecases/deletePerson";
import type { UpdatePersonInput } from "@/types/person";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function updatePersonAction(
  id: string,
  input: UpdatePersonInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createPersonRepository(supabase);

  try {
    const result = await updatePerson(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitPersonData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "制作陣が見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deletePersonAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();

  const repo = createPersonRepository(supabase);

  try {
    await deletePerson(repo, id);
    revalidateOrbitPersonData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "制作陣の削除に失敗しました" };
    }
    throw e;
  }
}
