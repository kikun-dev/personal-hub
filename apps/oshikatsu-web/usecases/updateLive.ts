import type { LiveRepository } from "@/types/repositories";
import type { Live, UpdateLiveInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateLive } from "./validateLive";

export async function updateLive(
  repo: LiveRepository,
  id: string,
  input: UpdateLiveInput
): Promise<Result<Live, ValidationError[]>> {
  const errors = validateLive(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const live = await repo.update(id, input);
  return { ok: true, data: live };
}
