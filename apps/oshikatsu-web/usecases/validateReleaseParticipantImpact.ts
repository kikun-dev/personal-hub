import { pickFirstDatedRelease, type DatedRelease } from "@/lib/firstRelease";
import type { ValidationError } from "@/types/errors";
import type {
  ReleaseParticipantScopeFacts,
  TrackParticipantScopeFact,
} from "@/types/repositories";
import { findOutOfScopeMemberIds } from "./validateParticipantScope";

const NEW_RELEASE_ID = "__new_release__";

export type ReleaseChange =
  | {
      kind: "create";
      releaseDate: string | null;
      trackIds: string[];
      participantMemberIds: string[];
    }
  | {
      kind: "update";
      releaseId: string;
      releaseDate: string | null;
      trackIds: string[];
      participantMemberIds: string[];
    }
  | {
      kind: "delete";
      releaseId: string;
    };

function applyReleaseChange(
  fact: TrackParticipantScopeFact,
  change: ReleaseChange
): DatedRelease[] {
  if (change.kind === "create") {
    if (!change.trackIds.includes(fact.trackId)) {
      return fact.releaseLinks;
    }
    return [
      ...fact.releaseLinks,
      { releaseId: NEW_RELEASE_ID, releaseDate: change.releaseDate },
    ];
  }

  const linksWithoutChangedRelease = fact.releaseLinks.filter(
    (link) => link.releaseId !== change.releaseId
  );
  if (change.kind === "delete" || !change.trackIds.includes(fact.trackId)) {
    return linksWithoutChangedRelease;
  }

  return [
    ...linksWithoutChangedRelease,
    { releaseId: change.releaseId, releaseDate: change.releaseDate },
  ];
}

function participantMemberIdsForRelease(
  releaseId: string,
  facts: ReleaseParticipantScopeFacts,
  change: ReleaseChange
): string[] {
  if (change.kind === "create" && releaseId === NEW_RELEASE_ID) {
    return change.participantMemberIds;
  }
  if (change.kind === "update" && releaseId === change.releaseId) {
    return change.participantMemberIds;
  }
  return facts.releaseParticipants[releaseId] ?? [];
}

/**
 * 変更後の初出リリース候補ごとの許可集合を返す。
 *
 * create時に新規リリースと既存リリースの最古日が同じ場合だけ、保存前には
 * UUIDタイブレークを予測できないため、同日の全候補を返す（#432 / #448）。
 * update/deleteはIDが確定済みなので正規のpickFirstDatedRelease 1件だけを使う。
 */
function findAllowedMemberScopes(
  releaseLinks: DatedRelease[],
  facts: ReleaseParticipantScopeFacts,
  change: ReleaseChange
): string[][] | null {
  const firstRelease = pickFirstDatedRelease(releaseLinks);
  if (firstRelease === null) return null;

  const firstCandidates =
    change.kind === "create" && firstRelease.releaseDate === change.releaseDate
      ? releaseLinks.filter(
          (link) => link.releaseDate === firstRelease.releaseDate
        )
      : [firstRelease];

  return firstCandidates.map((release) =>
    participantMemberIdsForRelease(release.releaseId, facts, change)
  );
}

function formatTrackTitles(tracks: TrackParticipantScopeFact[]): string {
  return tracks.map((track) => `「${track.trackTitle}」`).join("、");
}

/**
 * リリース変更後も `楽曲参加メンバー ⊆ 初出リリース参加メンバー` が成立するか検証する。
 * Repositoryから取得した現在のfactへ変更を適用する純粋関数で、DB mutationは行わない。
 */
export function validateReleaseParticipantImpact(
  facts: ReleaseParticipantScopeFacts,
  change: ReleaseChange
): ValidationError[] {
  const orphanTracks: TrackParticipantScopeFact[] = [];
  const undeterminedTracks: TrackParticipantScopeFact[] = [];
  const outOfScopeTracks: TrackParticipantScopeFact[] = [];

  for (const fact of facts.tracks) {
    if (change.kind === "create" && !change.trackIds.includes(fact.trackId)) {
      continue;
    }
    if (fact.isCatchallGroup) continue;

    const releaseLinks = applyReleaseChange(fact, change);
    if (releaseLinks.length === 0) {
      orphanTracks.push(fact);
      continue;
    }

    // 参加メンバー未登録は正常。リリースリンクの孤立だけは上で独立して検証する。
    if (fact.participantMemberIds.length === 0) continue;

    const allowedScopes = findAllowedMemberScopes(releaseLinks, facts, change);
    if (allowedScopes === null) {
      undeterminedTracks.push(fact);
      continue;
    }

    const violatesAnyScope = allowedScopes.some(
      (allowedMemberIds) =>
        findOutOfScopeMemberIds(
          fact.participantMemberIds,
          allowedMemberIds
        ).length > 0
    );
    if (violatesAnyScope) {
      outOfScopeTracks.push(fact);
    }
  }

  if (orphanTracks.length > 0) {
    return [
      {
        field: "_form",
        message: `この変更では、どのリリースにも紐づかなくなる楽曲があります（対象: ${formatTrackTitles(orphanTracks)}）。対象の楽曲は紐づけを残すか、先に別のリリースへ移してから保存してください。`,
      },
    ];
  }

  if (undeterminedTracks.length > 0) {
    return [
      {
        field: "_form",
        message: `この変更では、初出リリースが未確定になる参加メンバー登録済みの楽曲があります（対象: ${formatTrackTitles(undeterminedTracks)}）。先に対象楽曲の参加メンバーを編集するか、日付付きリリースへの紐づけを残してください。`,
      },
    ];
  }

  if (outOfScopeTracks.length > 0) {
    return [
      {
        field: "_form",
        message: `この変更では、楽曲参加メンバーが初出リリースの参加メンバー範囲外になります（対象: ${formatTrackTitles(outOfScopeTracks)}）。先に対象楽曲の参加メンバーを編集してから保存してください。`,
      },
    ];
  }

  return [];
}
