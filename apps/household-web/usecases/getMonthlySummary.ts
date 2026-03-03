import type { MonthlySummary, CategoryTotal } from "@/types/summary";
import type { Transaction } from "@/types/transaction";

function calculateCategoryBreakdown(
  transactions: Transaction[],
  type: "income" | "expense"
): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();

  for (const tx of transactions) {
    if (tx.type !== type) continue;

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

export function calculateMonthlySummary(
  transactions: Transaction[],
  year: number,
  month: number
): MonthlySummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let oshikatsuExpense = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
      if (tx.isOshikatsu) {
        oshikatsuExpense += tx.amount;
      }
    }
  }

  return {
    year,
    month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    oshikatsuExpense,
    regularExpense: totalExpense - oshikatsuExpense,
    expenseBreakdown: calculateCategoryBreakdown(transactions, "expense"),
    incomeBreakdown: calculateCategoryBreakdown(transactions, "income"),
  };
}
