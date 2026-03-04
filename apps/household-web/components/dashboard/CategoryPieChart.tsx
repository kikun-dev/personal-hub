"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CategoryTotal } from "@/types/summary";
import { getCategoryColor } from "@/lib/chartColors";
import { formatYen } from "@/lib/formatters";

type CategoryPieChartProps = {
  data: CategoryTotal[];
};

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/40">
        データがありません
      </p>
    );
  }

  const chartData = data.map((item) => ({
    name: item.categoryName,
    value: item.total,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_entry, index) => (
              <Cell
                key={`category-${index}`}
                fill={getCategoryColor(index)}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | undefined) => formatYen(value ?? 0)}
            contentStyle={{
              backgroundColor: "var(--background)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
