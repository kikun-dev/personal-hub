"use client";

import { useState } from "react";
import type { MonthlySummary } from "@/types/summary";
import { formatYen } from "@/lib/formatters";

type TransactionSummaryProps = {
  summary: MonthlySummary;
};

export function TransactionSummary({ summary }: TransactionSummaryProps) {
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  const breakdown =
    activeTab === "expense"
      ? summary.expenseBreakdown
      : summary.incomeBreakdown;

  return (
    <div className="space-y-4">
      {/* 収支バランス */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-foreground/[0.03] p-4">
          <p className="text-xs text-foreground/50">収入</p>
          <p className="mt-1 text-lg font-bold text-green-600">
            {formatYen(summary.totalIncome)}
          </p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] p-4">
          <p className="text-xs text-foreground/50">支出</p>
          <p className="mt-1 text-lg font-bold text-red-500">
            {formatYen(summary.totalExpense)}
          </p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] p-4">
          <p className="text-xs text-foreground/50">差額</p>
          <p
            className={`mt-1 text-lg font-bold ${
              summary.balance >= 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {formatYen(summary.balance)}
          </p>
        </div>
      </div>

      {/* 推し活小計 */}
      {summary.oshikatsuExpense > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 dark:border-purple-800 dark:bg-purple-950">
          <span className="text-sm text-purple-700 dark:text-purple-300">
            推し活支出
          </span>
          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
            {formatYen(summary.oshikatsuExpense)}
          </span>
        </div>
      )}

      {/* 収入/支出タブ */}
      <div>
        <div className="flex border-b border-foreground/10">
          <button
            onClick={() => setActiveTab("expense")}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === "expense"
                ? "border-b-2 border-foreground font-medium text-foreground"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            支出内訳
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === "income"
                ? "border-b-2 border-foreground font-medium text-foreground"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            収入内訳
          </button>
        </div>

        {/* カテゴリ別内訳 */}
        <div className="mt-3 space-y-2">
          {breakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-foreground/40">
              データがありません
            </p>
          ) : (
            breakdown.map((item) => (
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
