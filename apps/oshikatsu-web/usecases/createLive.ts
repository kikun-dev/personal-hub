import type { LiveRepository } from "@/types/repositories";
import type { Live, CreateLiveInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateLive } from "./validateLive";

export async function createLive(
  repo: LiveRepository,
  input: CreateLiveInput
): Promise<Result<Live, ValidationError[]>> {
  const errors = validateLive(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const live = await repo.create(input);
  return { ok: true, data: live };
}
