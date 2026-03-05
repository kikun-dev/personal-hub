/**
 * URL search params から year/month を安全にパースする。
 * 無効な値の場合は現在の年月にフォールバックする。
 */
export function parseMonthParams(params: {
  year?: string;
  month?: string;
}, now: Date = new Date()): { year: number; month: number } {
  const rawYear = Number(params.year);
  const rawMonth = Number(params.month);
  return {
    year:
      Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100
        ? rawYear
        : now.getFullYear(),
    month:
      Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
        ? rawMonth
        : now.getMonth() + 1,
  };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

type CalendarDateParams = {
  year?: string;
  month?: string;
  day?: string;
};

/**
 * トップ画面用の year/month/day パラメータを安全にパースする。
 * - day 未指定: 当月なら今日 / 他月なら1日
 * - day 無効値: 1〜月末に丸める
 */
export function parseCalendarDateParams(
  params: CalendarDateParams,
  now: Date = new Date()
): { year: number; month: number; day: number } {
  const { year, month } = parseMonthParams(params, now);
  const lastDay = getDaysInMonth(year, month);
  const rawDay = Number(params.day);

  const defaultDay =
    year === now.getFullYear() && month === now.getMonth() + 1
      ? now.getDate()
      : 1;

  const day = Number.isInteger(rawDay)
    ? Math.min(Math.max(rawDay, 1), lastDay)
    : Math.min(Math.max(defaultDay, 1), lastDay);

  return { year, month, day };
}
