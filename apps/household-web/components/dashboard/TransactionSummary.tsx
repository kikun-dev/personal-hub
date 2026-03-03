"use client";

import type { MonthlySummary } from "@/types/summary";
import { formatYen } from "@/lib/formatters";

type TransactionSummaryProps = {
  summary: MonthlySummary;
};

export function TransactionSummary({ summary }: TransactionSummaryProps) {
  return (
    <div className="space-y-4">
      {/* 支出合計 */}
      <div className="rounded-lg bg-foreground/[0.03] p-4">
        <p className="text-xs text-foreground/50">支出合計</p>
        <p className="mt-1 text-2xl font-bold text-red-500">
          {formatYen(summary.totalExpense)}
        </p>
      </div>

      {/* 通常/推し活の小計 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-foreground/[0.03] p-3">
          <p className="text-xs text-foreground/50">通常支出</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {formatYen(summary.regularExpense)}
          </p>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
          <p className="text-xs text-purple-700 dark:text-purple-300">推し活支出</p>
          <p className="mt-1 text-sm font-bold text-purple-700 dark:text-purple-300">
            {formatYen(summary.oshikatsuExpense)}
          </p>
        </div>
      </div>

      {/* カテゴリ別内訳 */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground/60">
          カテゴリ別内訳
        </h3>
        <div className="space-y-2">
          {summary.expenseBreakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-foreground/40">
              データがありません
            </p>
          ) : (
            summary.expenseBreakdown.map((item) => (
              <div
                key={item.categoryId}
                className="flex items-center justify-between py-1.5"
              >
                <span className="text-sm text-foreground/70">
                  {item.categoryName}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatYen(item.total)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
