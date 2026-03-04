export type Member = {
  id: string;
  nameJa: string;
  nameKana: string;
  nameEn: string | null;
  dateOfBirth: string | null;
  bloodType: string | null;
  heightCm: number | null;
  hometown: string | null;
  imageUrl: string | null;
  blogUrl: string | null;
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
};

export type CreateMemberInput = {
  nameJa: string;
  nameKana: string;
  nameEn: string;
  dateOfBirth: string;
  bloodType: string;
  heightCm: string;
  hometown: string;
  imageUrl: string;
  blogUrl: string;
  groups: CreateMemberGroupInput[];
};

export type CreateMemberGroupInput = {
  groupId: string;
  generation: string;
  joinedAt: string;
  graduatedAt: string;
};

export type UpdateMemberInput = CreateMemberInput;

export type MemberFilters = {
  groupId?: string;
  status?: "active" | "graduated" | "all";
  generation?: string;
};
