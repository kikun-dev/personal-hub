import type { ReleaseRepository } from "@/types/repositories";
import type { Release, CreateReleaseInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateRelease } from "./validateRelease";

export async function createRelease(
  repo: ReleaseRepository,
  input: CreateReleaseInput
): Promise<Result<Release, ValidationError[]>> {
  const errors = validateRelease(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const release = await repo.create(input);
  return { ok: true, data: release };
}
