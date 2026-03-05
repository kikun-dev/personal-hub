export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;
  // date-only "YYYY-MM-DD" は ECMAScript 仕様で UTC としてパースされるため
  // toISOString() との比較でタイムゾーンずれは発生しない
  // new Date("2025-02-30") → 2025-03-02 のようなずれを検出
  return date.toISOString().startsWith(value);
}

export function isValidHashtag(value: string): boolean {
  return value.startsWith("#") && value.length > 1;
}
