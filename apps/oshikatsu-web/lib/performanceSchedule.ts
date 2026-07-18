import type { LivePerformance, LiveType } from "@/types/live";
import { formatMonthDayWithWeekday } from "@/lib/formatters";

// 種別ごとに時間ラベルを出し分ける（フェス=出演時刻、配信=配信時刻、開場は出さない）
export function formatScheduleTime(
  liveType: LiveType,
  doorsOpenAt: string | null,
  startsAt: string | null
): string | null {
  if (liveType === "online") {
    return startsAt ? `配信 ${startsAt}` : null;
  }
  if (liveType === "festival") {
    return startsAt ? `出演 ${startsAt}` : null;
  }
  if (doorsOpenAt && startsAt) return `開場 ${doorsOpenAt} / 開演 ${startsAt}`;
  if (startsAt) return `開演 ${startsAt}`;
  if (doorsOpenAt) return `開場 ${doorsOpenAt}`;
  return null;
}

export function formatScheduleLine(
  liveType: LiveType,
  performance: LivePerformance
): string {
  const date = performance.performanceDate
    ? formatMonthDayWithWeekday(performance.performanceDate)
    : "日付未定";
  const time = formatScheduleTime(
    liveType,
    performance.doorsOpenAt,
    performance.startsAt
  );
  return time ? `${date} ${time}` : date;
}
