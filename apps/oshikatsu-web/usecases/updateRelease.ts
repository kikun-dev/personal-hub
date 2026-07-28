import type { ReleaseRepository } from "@/types/repositories";
import type { Release, UpdateReleaseInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateRelease } from "./validateRelease";
import { validateReleaseParticipantImpact } from "./validateReleaseParticipantImpact";

export async function updateRelease(
  repo: ReleaseRepository,
  id: string,
  input: UpdateReleaseInput
): Promise<Result<Release, ValidationError[]>> {
  const errors = validateRelease(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const existing = await repo.findById(id);
  if (existing === null) {
    return {
      ok: false,
      errors: [{ field: "_form", message: "更新対象のリリースが見つかりません" }],
    };
  }

  const trackIds = input.trackLinks.map((link) => link.trackId);
  const affectedTrackIds = Array.from(
    new Set([...existing.tracks.map((track) => track.trackId), ...trackIds])
  );
  const facts = await repo.findTrackParticipantScopeFacts(affectedTrackIds);
  const impactErrors = validateReleaseParticipantImpact(facts, {
    kind: "update",
    releaseId: id,
    releaseDate: input.releaseDate || null,
    trackIds,
    participantMemberIds: input.participantMemberIds,
  });
  if (impactErrors.length > 0) {
    return { ok: false, errors: impactErrors };
  }

  const release = await repo.update(id, input);
  return { ok: true, data: release };
}
