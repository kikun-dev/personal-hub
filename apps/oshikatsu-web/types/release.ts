export const RELEASE_TYPES = [
  "single",
  "album",
  "digital_single",
  "other",
] as const;

export type ReleaseType = (typeof RELEASE_TYPES)[number];

export const RELEASE_TYPE_LABELS: Record<ReleaseType, string> = {
  single: "シングル",
  album: "アルバム",
  digital_single: "配信シングル",
  other: "その他",
};

export type ReleaseBonusVideo = {
  id: string;
  edition: string;
  title: string;
  description: string | null;
  sortOrder: number;
};

export type ReleaseTrack = {
  trackId: string;
  trackTitle: string;
  trackNumber: number;
};

export type Release = {
  id: string;
  title: string;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  releaseType: ReleaseType;
  numbering: number | null;
  releaseDate: string | null;
  artworkPath: string | null;
  artworkPersonName: string | null;
  trackCount: number;
  participantMemberIds: string[];
  participantMemberNames: string[];
  bonusVideos: ReleaseBonusVideo[];
  tracks: ReleaseTrack[];
};

export type ReleaseListItem = {
  id: string;
  title: string;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  releaseType: ReleaseType;
  numbering: number | null;
  releaseDate: string | null;
  trackCount: number;
};

export type ReleaseOption = {
  id: string;
  title: string;
  releaseType: ReleaseType;
  participantMemberIds: string[];
  participantMemberNames: string[];
};

export type CreateReleaseBonusVideoInput = {
  edition: string;
  title: string;
  description: string;
};

export type CreateReleaseTrackLinkInput = {
  trackId: string;
  trackNumber: string;
};

export type CreateReleaseInput = {
  title: string;
  groupId: string;
  releaseType: ReleaseType | "";
  numbering: string;
  releaseDate: string;
  artworkPath: string;
  artworkPersonName: string;
  participantMemberIds: string[];
  bonusVideos: CreateReleaseBonusVideoInput[];
  trackLinks: CreateReleaseTrackLinkInput[];
};

export type UpdateReleaseInput = CreateReleaseInput;

export type ReleaseImageUploadInput = {
  fileName: string;
  mimeType: string;
  size: number;
  base64Data: string;
};

export type ReleaseFilters = {
  groupId?: string;
  releaseType?: ReleaseType;
};

export function isReleaseType(value: string): value is ReleaseType {
  return (RELEASE_TYPES as readonly string[]).includes(value);
}
