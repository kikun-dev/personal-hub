"use client";

import type { MonthlySummary } from "@/types/summary";
import { formatYen } from "@/lib/formatters";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { OshikatsuDonutChart } from "@/components/dashboard/OshikatsuDonutChart";

type TransactionSummaryProps = {
  summary: MonthlySummary;
  isOshikatsuMode: boolean;
};

export function TransactionSummary({
  summary,
  isOshikatsuMode,
}: TransactionSummaryProps) {
  return (
    <div className="space-y-4">
      {/* 合計表示 */}
      {isOshikatsuMode ? (
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
          <p className="text-xs text-purple-700 dark:text-purple-300">
            推し活支出合計
          </p>
          <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">
            {formatYen(summary.oshikatsuExpense)}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg bg-foreground/[0.03] p-4">
            <p className="text-xs text-foreground/50">支出合計</p>
            <p className="mt-1 text-2xl font-bold text-red-500">
              {formatYen(summary.totalExpense)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-foreground/[0.03] p-3">
              <p className="text-xs text-foreground/50">通常支出</p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {formatYen(summary.regularExpense)}
              </p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
              <p className="text-xs text-purple-700 dark:text-purple-300">
                推し活支出
              </p>
              <p className="mt-1 text-sm font-bold text-purple-700 dark:text-purple-300">
                {formatYen(summary.oshikatsuExpense)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* チャート */}
      {isOshikatsuMode ? (
        <OshikatsuDonutChart data={summary.oshikatsuBreakdown} />
      ) : (
        <CategoryPieChart data={summary.expenseBreakdown} />
      )}

      {/* 内訳リスト */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground/60">
          {isOshikatsuMode ? "推しグループ別内訳" : "カテゴリ別内訳"}
        </h3>
        <div className="space-y-2">
          {isOshikatsuMode ? (
            summary.oshikatsuBreakdown.length === 0 ? (
              <p className="py-4 text-center text-sm text-foreground/40">
                データがありません
              </p>
            ) : (
              summary.oshikatsuBreakdown.map((group) => (
                <div key={group.groupName} className="space-y-1">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {group.groupName}
                    </span>
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {formatYen(group.total)}
                    </span>
                  </div>
                  {group.activities.map((activity) => (
                    <div
                      key={activity.activityType}
                      className="flex items-center justify-between py-0.5 pl-4"
                    >
                      <span className="text-xs text-foreground/50">
                        {activity.activityType}
                      </span>
                      <span className="text-xs text-foreground/60">
                        {formatYen(activity.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )
          ) : summary.expenseBreakdown.length === 0 ? (
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
