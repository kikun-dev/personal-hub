import type { ReleaseType } from "@/types/release";

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
  durationSeconds: number | null;
  releaseDate: string | null;
  groupIds: string[];
  groupNames: string[];
  releases: SongReleaseLink[];
  credits: SongCredit[];
  formationRows: SongFormationRow[];
  mv: SongMv | null;
  costumes: SongCostume[];
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
  durationSeconds: string;
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
