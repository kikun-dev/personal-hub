"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { OshikatsuGroupTotal } from "@/types/summary";
import type { OshikatsuGroup } from "@/lib/constants";
import {
  OSHIKATSU_GROUP_COLORS,
  getActivityColor,
} from "@/lib/chartColors";
import { formatYen } from "@/lib/formatters";

type OshikatsuDonutChartProps = {
  data: OshikatsuGroupTotal[];
};

type OuterDatum = {
  name: string;
  value: number;
  groupName: string;
  activityIndex: number;
};

export function OshikatsuDonutChart({ data }: OshikatsuDonutChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/40">
        推し活データがありません
      </p>
    );
  }

  const innerData = data.map((group) => ({
    name: group.groupName,
    value: group.total,
  }));

  const outerData: OuterDatum[] = data.flatMap((group) =>
    group.activities.map((activity, activityIndex) => ({
      name: `${group.groupName} / ${activity.activityType}`,
      value: activity.total,
      groupName: group.groupName,
      activityIndex,
    }))
  );

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={innerData}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={60}
            paddingAngle={2}
            dataKey="value"
          >
            {innerData.map((entry) => (
              <Cell
                key={`group-${entry.name}`}
                fill={
                  OSHIKATSU_GROUP_COLORS[entry.name as OshikatsuGroup]
                    ?? OSHIKATSU_GROUP_COLORS["その他"]
                }
              />
            ))}
          </Pie>
          <Pie
            data={outerData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={1}
            dataKey="value"
          >
            {outerData.map((entry, index) => (
              <Cell
                key={`activity-${index}`}
                fill={getActivityColor(entry.groupName, entry.activityIndex)}
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
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
