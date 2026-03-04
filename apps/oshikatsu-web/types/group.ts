export type Group = {
  id: string;
  nameJa: string;
  nameEn: string | null;
  color: string;
  isActive: boolean;
  successorId: string | null;
  sortOrder: number;
};
