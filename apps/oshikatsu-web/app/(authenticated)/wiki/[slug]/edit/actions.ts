"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createWikiRepository } from "@/repositories/wikiRepository";
import { revalidateOrbitWikiData } from "@/lib/revalidateOrbit";
import { updateWikiPage } from "@/usecases/updateWikiPage";
import { deleteWikiPage } from "@/usecases/deleteWikiPage";
import type { UpdateWikiPageInput } from "@/types/wiki";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";
import {
  isDuplicateWikiSlugError,
  DUPLICATE_WIKI_SLUG_MESSAGE,
} from "@/lib/wikiPageErrors";

export async function updateWikiPageAction(
  id: string,
  input: UpdateWikiPageInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createWikiRepository(supabase);

  try {
    const result = await updateWikiPage(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitWikiData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      if (isDuplicateWikiSlugError(e)) {
        return {
          errors: [{ field: "slug", message: DUPLICATE_WIKI_SLUG_MESSAGE }],
        };
      }
      return {
        errors: [
          { field: "_form", message: "Wikiページが見つからないか、更新に失敗しました" },
        ],
      };
    }
    throw e;
  }
}

export async function deleteWikiPageAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();

  const repo = createWikiRepository(supabase);

  try {
    await deleteWikiPage(repo, id);
    revalidateOrbitWikiData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "Wikiページの削除に失敗しました" };
    }
    throw e;
  }
}
