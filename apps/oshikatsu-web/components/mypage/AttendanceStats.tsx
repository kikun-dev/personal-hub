"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AttendanceListItem } from "@/components/mypage/AttendanceListItem";
import { YearlyAttendanceChart } from "@/components/mypage/charts/YearlyAttendanceChart";
import { GroupAttendanceChart } from "@/components/mypage/charts/GroupAttendanceChart";
import { AttendedTypeBreakdown } from "@/components/mypage/charts/AttendedTypeBreakdown";
import type { AttendanceStats as AttendanceStatsResult } from "@/usecases/getAttendanceStats";
import { OTHER_GROUP_ID } from "@/usecases/getAttendanceStats";
import { APP_ROUTES } from "@/lib/routes";

type AttendanceStatsProps = {
  stats: AttendanceStatsResult;
  year: number | undefined;
  groupId: string | undefined;
};

// 参加記録の集計・ビジュアライズ画面（Issue #248）。年・グループの絞り込みは
// URLパラメータ（?year=&group=）で表現し、router.replace でServer Component
// （app/(authenticated)/mypage/stats/page.tsx）を再実行させて集計をやり直す
// （既存の一覧ページの年月フィルタ = MonthSelector と同じ「URL params + Server
// Component 再レンダリング」の慣習に合わせる）。
export function AttendanceStats({ stats, year, groupId }: AttendanceStatsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: "year" | "group", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.replace(`${APP_ROUTES.mypageStats}${query ? `?${query}` : ""}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={year !== undefined ? String(year) : ""}
          onChange={(event) => updateParam("year", event.target.value)}
          aria-label="年で絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全期間</option>
          {stats.availableYears.map((availableYear) => (
            <option key={availableYear} value={availableYear}>
              {availableYear}年
            </option>
          ))}
        </select>

        <select
          value={groupId ?? ""}
          onChange={(event) => updateParam("group", event.target.value)}
          aria-label="グループで絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全グループ</option>
          {stats.availableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.nameJa}
            </option>
          ))}
          {stats.hasOtherGroupEntries && (
            <option value={OTHER_GROUP_ID}>その他</option>
          )}
        </select>

        <span className="ml-auto shrink-0 text-sm text-foreground/50">
          {stats.filteredEntries.length}件
        </span>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">年別の参加数</h2>
        <YearlyAttendanceChart data={stats.yearlyCounts} undatedCount={stats.undatedCount} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">グループ別の参加数</h2>
        <GroupAttendanceChart data={stats.groupCounts} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">参加種別の内訳</h2>
        <AttendedTypeBreakdown data={stats.attendedTypeCounts} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">記録一覧</h2>
        {stats.filteredEntries.length === 0 ? (
          <p className="text-sm text-foreground/60">
            該当する参加記録がありません
          </p>
        ) : (
          <ul className="space-y-2">
            {stats.filteredEntries.map((entry) => (
              <AttendanceListItem
                key={entry.id}
                entry={entry}
                backHref={APP_ROUTES.mypageStats}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
