"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createWikiRepository } from "@/repositories/wikiRepository";
import { revalidateOrbitWikiData } from "@/lib/revalidateOrbit";
import { createWikiPage } from "@/usecases/createWikiPage";
import type { CreateWikiPageInput } from "@/types/wiki";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";
import {
  isDuplicateWikiSlugError,
  DUPLICATE_WIKI_SLUG_MESSAGE,
} from "@/lib/wikiPageErrors";

export async function createWikiPageAction(
  input: CreateWikiPageInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createWikiRepository(supabase);

  try {
    const result = await createWikiPage(repo, input);
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
        errors: [{ field: "_form", message: "Wikiページの作成に失敗しました" }],
      };
    }
    throw e;
  }
}
