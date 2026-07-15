// ライブ詳細の日付 context（/lives/[id]?date=YYYY-MM-DD&performance=<performanceId>、
// Issue #346）。context 入力は信頼せず、境界で形式・実在日付を厳密に検証する
// （不正は null = fallback）。

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `?date=` の生値を検証し、正規化済みの "YYYY-MM-DD" を返す。
 * 形式不一致・実在しない日付（2026-02-30 等）・範囲外（2000〜2100年）は null。
 */
export function parseLiveDateParam(raw: string | undefined): string | null {
  if (typeof raw !== "string" || !DATE_PARAM_PATTERN.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number);
  if (year < 2000 || year > 2100) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return raw;
}

/** 戻り導線用: 検証済み "YYYY-MM-DD" からトップの選択日 URL（/?year&month&day）を組み立てる。 */
export function topPageDateHref(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `/?year=${year}&month=${month}&day=${day}`;
}

/** 戻り導線ラベル用: 検証済み "YYYY-MM-DD" → "M/D"（例: "8/9"）。 */
export function monthDayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-").map(Number);
  return `${month}/${day}`;
}

const PERFORMANCE_PARAM_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * `?performance=` の生値（公演の UUID）を検証する。形式不一致は null。
 * 実在・対象ライブとの対応はサーバー側（page）で performances と照合して検証する。
 */
export function parseLivePerformanceParam(raw: string | undefined): string | null {
  if (typeof raw !== "string" || !PERFORMANCE_PARAM_PATTERN.test(raw)) return null;
  return raw;
}

/** ライブ詳細の有効 context（#346）: date = 戻り先の日次文脈、performanceId = 「この公演」。 */
export type LiveDateContext = {
  date: string;
  performanceId: string;
};
