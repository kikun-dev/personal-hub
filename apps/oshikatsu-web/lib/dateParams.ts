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

// #412: "YYYY-MM-DD" を厳密にパースする。範囲外（例 2026-13-01）や存在しない日（例 2026-02-30）は
// JavaScript の Date が暗黙に別日へ繰り上げるため、生成後の year/month/day が入力と一致することまで
// 検証し、一致しなければ null を返す。E2E の固定日 seam（下記）と playwright.config の検証で共有し、
// パース・検証ロジックを1箇所に集約する。
export function parseStrictYmd(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

// #412: E2E（Playwright）が実データの「今日」に暗黙依存すると、今日にイベントが無い日は TOP
// 「今日の予定」等が空になり fail する。テストから「今日」を固定できるよう env seam を設ける。
// 有効条件（この2つを満たすときのみ override が効く。それ以外は通常どおり now を使う）:
//   1. 本番デプロイでない（`process.env.VERCEL` が無い）… 本番挙動は常に不変
//   2. `E2E_FIXED_TODAY` が実在する YYYY-MM-DD（parseStrictYmd が非 null）
// E2E は production build（NODE_ENV=production）を start して検証するため NODE_ENV では分岐できず、
// 専用 env の有無・妥当性で opt-in する。
function readFixedTodayOverride(): Date | null {
  if (process.env.VERCEL) return null;
  const raw = process.env.E2E_FIXED_TODAY;
  if (!raw) return null;
  return parseStrictYmd(raw);
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
