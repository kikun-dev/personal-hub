import type { SpotRepository } from "@/types/repositories";
import type { Spot, UpdateSpotInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateSpot } from "./validateSpot";

export async function updateSpot(
  repo: SpotRepository,
  id: string,
  input: UpdateSpotInput
): Promise<Result<Spot, ValidationError[]>> {
  const errors = validateSpot(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const spot = await repo.update(id, input);
  return { ok: true, data: spot };
}
