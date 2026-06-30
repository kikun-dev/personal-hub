import type { Group } from "@/types/group";

export const RELEASE_TYPES = [
  "single",
  "album",
  "best",
  "compilation",
  "digital_single",
  "other",
] as const;

export type ReleaseType = (typeof RELEASE_TYPES)[number];

export const RELEASE_TYPE_LABELS: Record<ReleaseType, string> = {
  single: "シングル",
  album: "アルバム",
  best: "ベストアルバム",
  compilation: "コンピレーション",
  digital_single: "配信シングル",
  other: "その他",
};

export const RELEASE_TYPE_LABELS_EN: Record<ReleaseType, string> = {
  single: "Single",
  album: "Album",
  best: "BEST Album",
  compilation: "Compilation Album",
  digital_single: "Digital Single",
  other: "Other",
};

// アルバム系（一覧フィルタ「アルバム」でまとめる）
export const ALBUM_FAMILY_TYPES: readonly ReleaseType[] = [
  "album",
  "best",
  "compilation",
];

// 一覧フィルタの選択肢（アルバム系は「アルバム」に集約して表示する）
export const RELEASE_FILTER_TYPES: readonly ReleaseType[] = [
  "single",
  "album",
  "digital_single",
  "other",
];

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
  participantMemberGenerations: Array<string | null>;
  memberPositions: ReleaseMemberPosition[];
  bonusVideos: ReleaseBonusVideo[];
  tracks: ReleaseTrack[];
};

// シングルの選抜ポジション（メンバー × リリース）
export const SELECTION_TIERS = ["senbatsu", "under", "generation"] as const;
export type SelectionTier = (typeof SELECTION_TIERS)[number];

export type ReleaseMemberPosition = {
  memberId: string;
  tier: SelectionTier;
  rowNumber: number | null;
  isCenter: boolean;
  isFrontSpecial: boolean;
};

export type CreateReleaseMemberPositionInput = {
  memberId: string;
  tier: SelectionTier | "";
  rowNumber: string;
  isCenter: boolean;
  isFrontSpecial: boolean;
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
  participantMemberKanas: string[];
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
  memberPositions: CreateReleaseMemberPositionInput[];
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
