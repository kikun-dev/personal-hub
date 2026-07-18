import type { CalendarDateRange } from "@/types/repositories";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PostgREST の `.or()` に渡す half-open date range filter を組み立てる。
 * 日付は UseCase が生成するが、filter 構文へ埋め込む境界で形式と順序を検証する。
 */
export function buildCalendarDateRangeFilter(
  column: string,
  ranges: CalendarDateRange[]
): string {
  validateCalendarDateRanges(ranges);
  return ranges
    .map(
      ({ startDate, endDate }) =>
        `and(${column}.gte.${startDate},${column}.lt.${endDate})`
    )
    .join(",");
}

/** RPC引数へ渡す場合も同じ境界検証を適用する。 */
export function validateCalendarDateRanges(ranges: CalendarDateRange[]): void {
  for (const { startDate, endDate } of ranges) {
    if (
      !ISO_DATE_PATTERN.test(startDate) ||
      !ISO_DATE_PATTERN.test(endDate) ||
      startDate >= endDate
    ) {
      throw new Error(`Invalid calendar date range: ${startDate}..${endDate}`);
    }
  }
}
