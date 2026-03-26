import type { SnsType } from "@/lib/constants";

export type Member = {
  id: string;
  nameJa: string;
  nameKana: string;
  nameEn: string | null;
  dateOfBirth: string | null;
  zodiac: string | null;
  bloodType: string | null;
  callName: string | null;
  penlightColor1: string | null;
  penlightColor2: string | null;
  heightCm: number | null;
  hometown: string | null;
  memo: string | null;
  imageUrl: string | null;
  blogUrl: string | null;
  blogHashtag: string | null;
  talkAppName: string | null;
  talkAppUrl: string | null;
  talkAppHashtag: string | null;
};

export type MemberGroup = {
  id: string;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  generation: string | null;
  joinedAt: string | null;
  graduatedAt: string | null;
};

export type MemberWithGroups = Member & {
  groups: MemberGroup[];
  sns: MemberSns[];
};

export type MemberListItem = Pick<
  Member,
  "id" | "imageUrl" | "nameJa" | "nameKana"
> & {
  groups: MemberGroup[];
};

export type MemberOption = {
  id: string;
  nameJa: string;
  groupIds: string[];
  groupNames: string[];
  isActive: boolean;
};

export type MemberSns = {
  id: string;
  snsType: SnsType;
  displayName: string;
  url: string;
  hashtag: string;
  sortOrder: number;
};

export type MemberHistory = {
  id: string;
  date: string;
  event: string;
  note: string;
};

export type BirthdayMember = {
  id: string;
  nameJa: string;
  dateOfBirth: string;
  groupNames: string[];
};

export type CreateMemberInput = {
  nameJa: string;
  nameKana: string;
  nameEn: string;
  dateOfBirth: string;
  zodiac?: string;
  bloodType: string;
  callName: string;
  penlightColor1: string;
  penlightColor2: string;
  heightCm: string;
  hometown: string;
  imageUrl: string;
  blogUrl: string;
  blogHashtag: string;
  talkAppName: string;
  talkAppUrl: string;
  talkAppHashtag: string;
  memo: string;
  groups: CreateMemberGroupInput[];
  sns: CreateMemberSnsInput[];
};

export type CreateMemberGroupInput = {
  groupId: string;
  generation: string;
  joinedAt: string;
  graduatedAt: string;
};

export type CreateMemberSnsInput = {
  snsType: SnsType;
  displayName: string;
  url: string;
  hashtag: string;
};

export type UpdateMemberInput = CreateMemberInput;

export type MemberImageUploadInput = {
  fileName: string;
  mimeType: string;
  size: number;
  base64Data: string;
};

export type MemberFilters = {
  groupId?: string;
  status?: "active" | "graduated" | "all";
  generation?: string;
};
