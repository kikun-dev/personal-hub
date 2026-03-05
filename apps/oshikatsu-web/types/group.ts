export type GroupPenlightColor = {
  id: string;
  name: string;
  hex: string;
  sortOrder: number;
};

export type Group = {
  id: string;
  nameJa: string;
  nameEn: string | null;
  color: string;
  maxGeneration: number | null;
  isActive: boolean;
  successorId: string | null;
  sortOrder: number;
  penlightColors: GroupPenlightColor[];
};
