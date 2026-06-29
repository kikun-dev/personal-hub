import type { ReleaseType } from "@/types/release";
import type { Group } from "@/types/group";

export const SONG_LABELS = [
  "title",
  "senbatsu",
  "under",
  "solo",
  "unit",
  "generation",
] as const;

export type SongLabel = (typeof SONG_LABELS)[number];

export const SONG_LABEL_LABELS: Record<SongLabel, string> = {
  title: "表題",
  senbatsu: "選抜",
  under: "アンダー",
  solo: "ソロ",
  unit: "ユニット",
  generation: "期別",
};

// アンダーのグループ別表示名（内部値は under 共通）
const UNDER_LABEL_BY_GROUP: Record<string, string> = {
  乃木坂46: "アンダー",
  櫻坂46: "BACKS",
  日向坂46: "ひなた坂",
};

export function isSongLabel(value: string): value is SongLabel {
  return (SONG_LABELS as readonly string[]).includes(value);
}

// 表示用ラベル文字列（under はグループ別、generation は「N期生曲」）
export function formatSongLabel(
  label: SongLabel | null,
  generation: string | null,
  groupNameJa: string
): string | null {
  if (!label) return null;
  if (label === "under") return UNDER_LABEL_BY_GROUP[groupNameJa] ?? "アンダー";
  if (label === "generation") return generation ? `${generation}期生曲` : "期別";
  return SONG_LABEL_LABELS[label];
}

export type SongCreditRole = "lyrics" | "music" | "arrangement" | "choreography";

export type SongCredit = {
  role: SongCreditRole;
  personName: string;
  sortOrder: number;
};

export type SongReleaseLink = {
  releaseId: string;
  releaseTitle: string;
  releaseType: ReleaseType;
  numbering: number | null;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  releaseDate: string | null;
  trackNumber: number;
};

export type SongFormationMember = {
  memberId: string;
  memberNameJa: string;
  slotOrder: number;
};

export type SongFormationRow = {
  rowNumber: number;
  memberCount: number;
  members: SongFormationMember[];
};

export type SongMv = {
  url: string;
  directorName: string | null;
  location: string | null;
  publishedOn: string | null;
  memo: string | null;
};

export type SongCostume = {
  id: string;
  stylistName: string;
  imagePath: string;
  note: string | null;
  sortOrder: number;
};

export type Song = {
  id: string;
  title: string;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  label: SongLabel | null;
  generation: string | null;
  releaseDate: string | null;
  representativeReleaseType: ReleaseType | null;
  representativeNumbering: number | null;
  releases: SongReleaseLink[];
  credits: SongCredit[];
  formationRows: SongFormationRow[];
  mv: SongMv | null;
  costumes: SongCostume[];
};

export type SongListItem = {
  id: string;
  title: string;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  label: SongLabel | null;
  generation: string | null;
  releaseCount: number;
  firstReleaseDate: string | null;
  // 一覧の並び替え用：初出（最古）リリースの識別子とトラック番号
  representativeReleaseId: string | null;
  representativeTrackNumber: number | null;
  // 一覧表示用：初出リリースの種別とナンバリング（例: 31st Single / 3rd Album）
  representativeReleaseType: ReleaseType | null;
  representativeNumbering: number | null;
};

export type SongSection = {
  group: Group | null;
  songs: SongListItem[];
};

export type SongOption = {
  id: string;
  title: string;
};

export type CreateSongReleaseLinkInput = {
  releaseId: string;
  trackNumber: string;
};

export type CreateSongFormationRowInput = {
  memberCount: string;
  memberIds: string[];
};

export type CreateSongMvInput = {
  url: string;
  directorName: string;
  location: string;
  publishedOn: string;
  memo: string;
};

export type CreateSongCostumeInput = {
  stylistName: string;
  imagePath: string;
  note: string;
};

export type CreateSongInput = {
  title: string;
  groupId: string;
  label: string;
  generation: string;
  releaseLinks: CreateSongReleaseLinkInput[];
  lyricsPeople: string;
  musicPeople: string;
  arrangementPeople: string;
  choreographyPeople: string;
  formationRows: CreateSongFormationRowInput[];
  mv: CreateSongMvInput;
  costumes: CreateSongCostumeInput[];
};

export type UpdateSongInput = CreateSongInput;

export type SongFilters = {
  groupId?: string;
};
