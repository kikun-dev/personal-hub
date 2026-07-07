import type { WikiRepository } from "@/types/repositories";
import type { WikiPage, CreateWikiPageInput } from "@/types/wiki";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateWikiPage } from "./validateWikiPage";

export async function createWikiPage(
  repo: WikiRepository,
  input: CreateWikiPageInput
): Promise<Result<WikiPage, ValidationError[]>> {
  const errors = validateWikiPage(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const page = await repo.create(input);
  return { ok: true, data: page };
}
