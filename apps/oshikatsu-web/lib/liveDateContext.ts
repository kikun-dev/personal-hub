// ライブ詳細の日付 context（/lives/[id]?date=YYYY-MM-DD、Issue #346）。
// context 入力は信頼せず、境界で形式・実在日付を厳密に検証する（不正は null = fallback）。

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
