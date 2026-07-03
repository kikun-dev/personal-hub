import type {
  CreateReleaseBonusVideoInput,
  CreateReleaseTrackLinkInput,
} from "@/types/release";

/**
 * ReleaseForm とそのセクション child（components/admin/release/*Section.tsx）で
 * 共有する型・純粋関数。ReleaseForm.tsx から直接 import すると
 * ReleaseForm -> セクション -> ReleaseForm の循環 import になるため、
 * ここへ切り出している。
 */

export type FormBonusVideo = CreateReleaseBonusVideoInput & { _key: string };
export type FormTrackLink = CreateReleaseTrackLinkInput & { _key: string };

export type ReleaseTrackOption = {
  id: string;
  title: string;
};

export type ReleaseParticipantOption = {
  id: string;
  nameJa: string;
  isInReleaseGroup: boolean;
};

export function supportsNumbering(releaseType: string): boolean {
  return releaseType === "single" || releaseType === "album";
}
