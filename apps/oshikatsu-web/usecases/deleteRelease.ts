import type { ReleaseRepository } from "@/types/repositories";
import type { Release } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateReleaseParticipantImpact } from "./validateReleaseParticipantImpact";

export async function deleteRelease(
  repo: ReleaseRepository,
  id: string
): Promise<Result<Release, ValidationError[]>> {
  const existing = await repo.findById(id);
  if (existing === null) {
    return {
      ok: false,
      errors: [{ field: "_form", message: "削除対象のリリースが見つかりません" }],
    };
  }

  const trackIds = existing.tracks.map((track) => track.trackId);
  const facts = await repo.findTrackParticipantScopeFacts(trackIds);
  const impactErrors = validateReleaseParticipantImpact(facts, {
    kind: "delete",
    releaseId: id,
  });
  if (impactErrors.length > 0) {
    return { ok: false, errors: impactErrors };
  }

  await repo.delete(id);
  return { ok: true, data: existing };
}
