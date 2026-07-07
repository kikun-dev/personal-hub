"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GroupCount } from "@/usecases/getAttendanceStats";
import { FALLBACK_GROUP_COLOR } from "@/lib/chartColors";

type GroupAttendanceChartProps = {
  data: GroupCount[];
};

// グループ別の延べ参戦数チャート（Issue #248）。1公演に複数グループ出演の場合、
// 出演グループ全てに1カウントする「延べ」集計（Design notes 論点2の決定）。
export function GroupAttendanceChart({ data }: GroupAttendanceChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/40">
        参戦記録がありません
      </p>
    );
  }

  // ラベル欄の高さを件数に応じて確保する（少数グループでも横棒が潰れないように下限を設ける）。
  const height = Math.max(data.length * 36, 96);

  return (
    <div className="space-y-1">
      <p className="text-xs text-foreground/40">
        延べ（複数グループ出演のライブは各グループにカウント）
      </p>
      <div className="w-full text-foreground/60" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
              stroke="currentColor"
            />
            <YAxis
              type="category"
              dataKey="groupNameJa"
              width={96}
              tick={{ fill: "currentColor", fontSize: 12 }}
              stroke="currentColor"
            />
            <Tooltip
              // recharts 3.9 で formatter の value は ValueType（string | number | ...）に広がったため
              // number 前提をやめ、数値以外は 0 件として表示する（従来と同じ表示結果）。
              formatter={(value) => [`${typeof value === "number" ? value : 0}件`, "参戦数"]}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.groupId} fill={entry.color ?? FALLBACK_GROUP_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
