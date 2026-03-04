"use client";

import { useState } from "react";
import type { Transaction } from "@/types/transaction";
import type { MonthlySummary } from "@/types/summary";
import { TransactionSummary } from "@/components/dashboard/TransactionSummary";
import { TransactionList } from "@/components/transactions/TransactionList";

type DashboardContentProps = {
  summary: MonthlySummary;
  transactions: Transaction[];
};

export function DashboardContent({
  summary,
  transactions,
}: DashboardContentProps) {
  const [isOshikatsuMode, setIsOshikatsuMode] = useState(false);

  const filteredTransactions = isOshikatsuMode
    ? transactions.filter((tx) => tx.isOshikatsu)
    : transactions;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground/60">
            {isOshikatsuMode ? "推し活モード" : "通常モード"}
          </span>
          <button
            type="button"
            onClick={() => setIsOshikatsuMode((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
              isOshikatsuMode ? "bg-purple-500" : "bg-foreground/10"
            }`}
            role="switch"
            aria-checked={isOshikatsuMode}
            aria-label="推し活モード切替"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
                isOshikatsuMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <TransactionSummary
        summary={summary}
        isOshikatsuMode={isOshikatsuMode}
      />

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground/60">
          {isOshikatsuMode ? "推し活取引一覧" : "取引一覧"}
        </h2>
        <TransactionList transactions={filteredTransactions} />
      </div>
    </div>
  );
}
