import type { ReleaseListItem, ReleaseType } from "@/types/release";

export function filterReleasesByGroup(
  releases: ReleaseListItem[],
  groupId: string
): ReleaseListItem[] {
  if (groupId === "") {
    return releases;
  }
  return releases.filter((release) => release.groupId === groupId);
}

export function filterReleasesByType(
  releases: ReleaseListItem[],
  releaseType: ReleaseType | ""
): ReleaseListItem[] {
  if (releaseType === "") {
    return releases;
  }
  return releases.filter((release) => release.releaseType === releaseType);
}
