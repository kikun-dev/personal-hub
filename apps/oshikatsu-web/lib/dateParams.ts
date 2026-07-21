export const APP_TIME_ZONE = "Asia/Tokyo";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export function getDatePartsInTimeZone(
  date: Date,
  timeZone: string = APP_TIME_ZONE
): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day)
  ) {
    return { year, month, day };
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

// #412: E2E（Playwright）は実データの「今日」に暗黙依存すると、今日にイベントが無い日は
// TOP「今日の予定」が空になり fail する。テストから「今日」を固定できるよう env seam を設ける。
// E2E は production build（NODE_ENV=production）を start して検証するため NODE_ENV では分岐できず、
// 専用 env `E2E_FIXED_TODAY`（YYYY-MM-DD）の有無で opt-in する。本番デプロイ（Vercel）では
// `process.env.VERCEL` があるため常に無視し、production 挙動は不変に保つ。
function readFixedTodayOverride(): Date | null {
  if (process.env.VERCEL) return null;
  const raw = process.env.E2E_FIXED_TODAY;
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function getTodayInAppTimeZone(now: Date = new Date()): Date {
  const fixed = readFixedTodayOverride();
  if (fixed) return fixed;
  const { year, month, day } = getDatePartsInTimeZone(now, APP_TIME_ZONE);
  return new Date(year, month - 1, day);
}

/**
 * URL search params から year/month を安全にパースする。
 * 無効な値の場合は現在の年月にフォールバックする。
 */
export function parseMonthParams(params: {
  year?: string;
  month?: string;
}, now: Date = getTodayInAppTimeZone()): { year: number; month: number } {
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
  now: Date = getTodayInAppTimeZone()
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
