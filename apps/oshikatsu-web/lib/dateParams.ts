/**
 * URL search params から year/month を安全にパースする。
 * 無効な値の場合は現在の年月にフォールバックする。
 */
export function parseMonthParams(params: {
  year?: string;
  month?: string;
}): { year: number; month: number } {
  const now = new Date();
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
