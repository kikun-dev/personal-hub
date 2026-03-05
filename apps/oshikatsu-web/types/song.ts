import type { SongPosition } from "@/lib/constants";

export type SongMember = {
  id: string;
  memberId: string;
  memberNameJa: string;
  position: SongPosition;
  positionOrder: number;
  isCenter: boolean;
};

export type Song = {
  id: string;
  title: string;
  lyricsBy: string | null;
  musicBy: string | null;
  releaseDate: string | null;
  groupIds: string[];
  groupNames: string[];
  members: SongMember[];
};

export type CreateSongMemberInput = {
  memberId: string;
  position: string;
  positionOrder: string;
  isCenter: boolean;
};

export type CreateSongInput = {
  title: string;
  lyricsBy: string;
  musicBy: string;
  releaseDate: string;
  groupIds: string[];
  members: CreateSongMemberInput[];
};

export type UpdateSongInput = CreateSongInput;

export type SongFilters = {
  groupId?: string;
};
