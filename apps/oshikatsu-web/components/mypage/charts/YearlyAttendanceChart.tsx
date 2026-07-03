"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyCount } from "@/usecases/getAttendanceStats";
import { YEARLY_BAR_COLOR } from "@/lib/chartColors";

type YearlyAttendanceChartProps = {
  data: YearlyCount[];
  undatedCount: number;
};

// 年別の参加数チャート（Issue #248）。年フィルタでは絞り込まず常に全期間を表示する
// （usecases/getAttendanceStats.ts のコメント参照）。
export function YearlyAttendanceChart({ data, undatedCount }: YearlyAttendanceChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/40">
        参加記録がありません
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="h-56 w-full text-foreground/60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
            <XAxis
              dataKey="year"
              tickFormatter={(year: number) => `${year}`}
              tick={{ fill: "currentColor", fontSize: 12 }}
              stroke="currentColor"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
              stroke="currentColor"
              width={32}
            />
            <Tooltip
              formatter={(value: number | undefined) => [`${value ?? 0}件`, "参加数"]}
              labelFormatter={(year) => (year !== undefined ? `${year}年` : "")}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="count" fill={YEARLY_BAR_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {undatedCount > 0 && (
        <p className="text-xs text-foreground/40">
          日程未定の参加が{undatedCount}件あります（この集計の対象外）
        </p>
      )}
    </div>
  );
}
