export type MonthlySummary = {
  year: number;
  month: number;
  totalExpense: number;
  oshikatsuExpense: number;
  regularExpense: number;
  expenseBreakdown: CategoryTotal[];
  oshikatsuBreakdown: OshikatsuGroupTotal[];
};

export type CategoryTotal = {
  categoryId: string;
  categoryName: string;
  total: number;
};

export type OshikatsuGroupTotal = {
  groupName: string;
  total: number;
  activities: OshikatsuActivityTotal[];
};

export type OshikatsuActivityTotal = {
  activityType: string;
  total: number;
};
