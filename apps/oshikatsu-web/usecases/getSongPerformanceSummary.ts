import type { SongPerformanceOccurrence } from "@/types/song";

export type SongPerformanceByLive = {
  liveId: string;
  liveName: string;
  // そのライブ内の総披露回数（公演横断で合算）
  count: number;
  firstDate: string | null;
  lastDate: string | null;
};

export type SongPerformanceSummary = {
  // 全ライブ合算の総披露回数
  totalCount: number;
  // 日付降順（末尾の披露日=lastDateで比較、null=末尾）。getSongEncounterSummary.ts /
  // getSetlistCount.ts の並び方と揃える
  byLive: SongPerformanceByLive[];
};

// ライブ内訳は最終披露日（lastDate）の降順（null=末尾）。sortByDateDesc という
// 命名・実装は getSongEncounterSummary.ts / getSetlistCount.ts と揃える。
function sortByDateDesc(
  byLive: SongPerformanceByLive[]
): SongPerformanceByLive[] {
  return [...byLive].sort((a, b) => {
    if (!a.lastDate && !b.lastDate) return 0;
    if (!a.lastDate) return 1;
    if (!b.lastDate) return -1;
    return b.lastDate.localeCompare(a.lastDate);
  });
}

/**
 * 楽曲詳細ページの「総披露回数」セクション用（Issue #281）。
 * findPerformanceOccurrences() で取得した「1披露=1件」の生データを、
 * 親ライブ（liveId）単位に束ねて合算する純粋関数。
 *
 * 個人の遭遇記録（旧・getSongEncounterSummary、ADR 0009対象外だったユーザー別データ）とは
 * 異なり、こちらは全ユーザー共通の客観集計であるため shared cache 経路に載せられる。
 * 同一公演内で同じ曲を複数回披露していれば、その回数分 occurrences に複数件含まれており、
 * そのままカウントに反映される。
 */
export function getSongPerformanceSummary(
  occurrences: SongPerformanceOccurrence[]
): SongPerformanceSummary {
  const byLiveMap = new Map<
    string,
    { liveId: string; liveName: string; count: number; dates: string[] }
  >();

  for (const occurrence of occurrences) {
    const entry = byLiveMap.get(occurrence.liveId) ?? {
      liveId: occurrence.liveId,
      liveName: occurrence.liveName,
      count: 0,
      dates: [],
    };
    entry.count += 1;
    if (occurrence.performanceDate) {
      entry.dates.push(occurrence.performanceDate);
    }
    byLiveMap.set(occurrence.liveId, entry);
  }

  const byLive: SongPerformanceByLive[] = Array.from(byLiveMap.values()).map(
    (entry) => {
      const sortedDates = [...entry.dates].sort();
      return {
        liveId: entry.liveId,
        liveName: entry.liveName,
        count: entry.count,
        firstDate: sortedDates[0] ?? null,
        lastDate: sortedDates[sortedDates.length - 1] ?? null,
      };
    }
  );

  return {
    totalCount: occurrences.length,
    byLive: sortByDateDesc(byLive),
  };
}
