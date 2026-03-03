export type MonthlySummary = {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  oshikatsuExpense: number;
  regularExpense: number;
  categoryBreakdown: CategoryTotal[];
};

export type CategoryTotal = {
  categoryId: string;
  categoryName: string;
  total: number;
};
