import type { LivePerformance } from "@/types/live";

// 「次の公演」判定用の performance chronology（#346）。
// 日次一覧の表示規則（時刻なしを先頭に置く compareDailyEvents）とは独立した時系列規則:
// - performanceDate 昇順
// - 同日は startsAt が双方既知の場合のみ startsAt 昇順で前後を判定する
// - 同日で startsAt が片方でも null の場合は前後関係を確定できないため、
//   時刻を推測して「次の公演」と判定しない（同日の時刻不明公演は候補から除外）
// - 同値・判定不能時の stable order は入力順（repository の取得順）
// - performanceDate が null の公演は時系列に置けないため候補にしない
export function findNextPerformance(
  performances: LivePerformance[],
  target: LivePerformance
): LivePerformance | null {
  if (target.performanceDate === null) return null;

  // 同日で target より後と確定できる公演（双方の startsAt が既知の場合のみ）
  let sameDayNext: LivePerformance | null = null;
  if (target.startsAt !== null) {
    for (const p of performances) {
      if (p.id === target.id) continue;
      if (p.performanceDate !== target.performanceDate) continue;
      if (p.startsAt === null || p.startsAt <= target.startsAt) continue;
      if (sameDayNext === null || p.startsAt < sameDayNext.startsAt!) {
        sameDayNext = p; // 同時刻は最初に見つかった方を維持（入力順 stable）
      }
    }
  }
  if (sameDayNext !== null) return sameDayNext;

  // 翌日以降の最初の日付の公演。日付内は startsAt 既知同士なら昇順、
  // 時刻不明を含む場合は入力順の先頭（時刻の推測はしない）。
  let next: LivePerformance | null = null;
  for (const p of performances) {
    if (p.performanceDate === null) continue;
    if (p.performanceDate <= target.performanceDate) continue;
    if (next === null || p.performanceDate < next.performanceDate!) {
      next = p;
    } else if (
      p.performanceDate === next.performanceDate &&
      p.startsAt !== null &&
      next.startsAt !== null &&
      p.startsAt < next.startsAt
    ) {
      next = p;
    }
  }
  return next;
}
