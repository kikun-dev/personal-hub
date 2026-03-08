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
  participantMemberIds: string[];
  participantMemberNames: string[];
  bonusVideos: ReleaseBonusVideo[];
  tracks: ReleaseTrack[];
};

export type CreateReleaseBonusVideoInput = {
  edition: string;
  title: string;
  description: string;
};

export type CreateReleaseInput = {
  title: string;
  groupId: string;
  releaseType: ReleaseType | "";
  numbering: string;
  releaseDate: string;
  artworkPath: string;
  participantMemberIds: string[];
  bonusVideos: CreateReleaseBonusVideoInput[];
};

export type UpdateReleaseInput = CreateReleaseInput;

export type ReleaseFilters = {
  groupId?: string;
  releaseType?: ReleaseType;
};

export function isReleaseType(value: string): value is ReleaseType {
  return (RELEASE_TYPES as readonly string[]).includes(value);
}
