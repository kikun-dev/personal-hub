import type { Group } from "@/types/group";

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

export const RELEASE_TYPE_LABELS_EN: Record<ReleaseType, string> = {
  single: "Single",
  album: "Album",
  digital_single: "Digital Single",
  other: "Other",
};

// 21 -> "21st", 5 -> "5th"
export function ordinalNumber(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

// 一覧用のリリース表記（例: "21st Single" / "5th Album" / "Digital Single"）
export function formatReleaseTypeLabel(
  releaseType: ReleaseType,
  numbering: number | null
): string {
  const typeLabel = RELEASE_TYPE_LABELS_EN[releaseType];
  return numbering ? `${ordinalNumber(numbering)} ${typeLabel}` : typeLabel;
}

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

export type ReleaseSection = {
  group: Group | null;
  releases: ReleaseListItem[];
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
