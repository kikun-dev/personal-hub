import type { ReleaseListItem, ReleaseType } from "@/types/release";
import { ALBUM_FAMILY_TYPES } from "@/types/release";

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
  // 「アルバム」選択時はアルバム系（ベスト/コンピ含む）をまとめて表示する
  if (releaseType === "album") {
    return releases.filter((release) =>
      ALBUM_FAMILY_TYPES.includes(release.releaseType)
    );
  }
  return releases.filter((release) => release.releaseType === releaseType);
}
