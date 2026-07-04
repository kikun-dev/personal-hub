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
  // 「その他」受け皿グループかどうか（#264）。既定のグループ read model はこれを除外する。
  isCatchall: boolean;
};
