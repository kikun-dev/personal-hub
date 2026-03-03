import type {
  MonthlySummary,
  CategoryTotal,
  OshikatsuGroupTotal,
} from "@/types/summary";
import type { Transaction } from "@/types/transaction";

function calculateExpenseBreakdown(
  transactions: Transaction[]
): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();

  for (const tx of transactions) {
    if (!tx.categoryId || !tx.categoryName) continue;

    const existing = map.get(tx.categoryId);
    if (existing) {
      existing.total += tx.amount;
    } else {
      map.set(tx.categoryId, {
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        total: tx.amount,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function calculateOshikatsuBreakdown(
  transactions: Transaction[]
): OshikatsuGroupTotal[] {
  const groupMap = new Map<
    string,
    { total: number; activities: Map<string, number> }
  >();

  for (const tx of transactions) {
    if (!tx.isOshikatsu || !tx.groupName) continue;

    const existing = groupMap.get(tx.groupName);
    const actKey = tx.activityType ?? "その他";

    if (existing) {
      existing.total += tx.amount;
      existing.activities.set(
        actKey,
        (existing.activities.get(actKey) ?? 0) + tx.amount
      );
    } else {
      const activities = new Map<string, number>();
      activities.set(actKey, tx.amount);
      groupMap.set(tx.groupName, { total: tx.amount, activities });
    }
  }

  return Array.from(groupMap.entries())
    .map(([groupName, data]) => ({
      groupName,
      total: data.total,
      activities: Array.from(data.activities.entries())
        .map(([activityType, total]) => ({ activityType, total }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

export function calculateMonthlySummary(
  transactions: Transaction[],
  year: number,
  month: number
): MonthlySummary {
  let totalExpense = 0;
  let oshikatsuExpense = 0;

  for (const tx of transactions) {
    totalExpense += tx.amount;
    if (tx.isOshikatsu) {
      oshikatsuExpense += tx.amount;
    }
  }

  return {
    year,
    month,
    totalExpense,
    oshikatsuExpense,
    regularExpense: totalExpense - oshikatsuExpense,
    expenseBreakdown: calculateExpenseBreakdown(transactions),
    oshikatsuBreakdown: calculateOshikatsuBreakdown(transactions),
  };
}
