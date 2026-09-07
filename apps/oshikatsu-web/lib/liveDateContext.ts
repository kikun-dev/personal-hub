import { isValidUuid } from "@/lib/validation";

// ライブ詳細の閲覧 context（Issue #346 / #491）。query 入力は信頼せず、
// 形式だけでなく、取得済みの対象 Live の公演と照合して解決する。

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

/**
 * `?performance=` の生値（公演の UUID）を検証する。形式不一致は null。
 * 実在・対象ライブとの対応はサーバー側（page）で performances と照合して検証する。
 */
export function parseLivePerformanceParam(raw: string | undefined): string | null {
  if (typeof raw !== "string" || !isValidUuid(raw)) return null;
  return raw.toLowerCase();
}

type PerformanceContextSource = {
  id: string;
  performanceDate: string | null;
};

/**
 * ライブ詳細の閲覧状態。Top の日付起点と、通常閲覧中の明示的な
 * 公演選択を区別し、どちらでもない bare URL を overview として表す。
 */
export type LiveDetailContext =
  | { kind: "overview" }
  | { kind: "top"; date: string; performanceId: string }
  | { kind: "performance"; performanceId: string };

/**
 * query と、取得済みの対象 Live に属する公演から閲覧 context を解決する。
 *
 * `date` が指定された場合は Top context として扱い、日付形式・公演の存在・
 * performanceDate との一致をすべて満たすときだけ受理する。不正な date を
 * performance 単独選択へ格下げしない。
 */
export function resolveLiveDetailContext(
  rawDate: string | undefined,
  rawPerformanceId: string | undefined,
  performances: readonly PerformanceContextSource[]
): LiveDetailContext {
  const hasDateParam = rawDate !== undefined;
  const performanceId = parseLivePerformanceParam(rawPerformanceId);
  const performance =
    performanceId === null
      ? null
      : performances.find(
          (candidate) => candidate.id.toLowerCase() === performanceId
        ) ?? null;

  if (hasDateParam) {
    const date = parseLiveDateParam(rawDate);
    if (
      date !== null &&
      performanceId !== null &&
      performance !== null &&
      performance.performanceDate === date
    ) {
      return { kind: "top", date, performanceId };
    }
    return { kind: "overview" };
  }

  if (performanceId !== null && performance !== null) {
    return { kind: "performance", performanceId };
  }

  return { kind: "overview" };
}
