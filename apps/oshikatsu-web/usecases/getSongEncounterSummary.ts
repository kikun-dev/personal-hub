import type { AttendedType, SongEncounter } from "@/types/attendance";
import { ATTENDED_TYPE_VALUES } from "@/types/attendance";

export type SongEncounterSummaryItem = {
  performanceId: string;
  performanceDate: string | null;
  liveId: string;
  liveName: string;
  attendedType: AttendedType;
};

export type SongEncounterTypeCount = {
  attendedType: AttendedType;
  count: number;
};

export type SongEncounterSummary = {
  count: number;
  // 参加種別ごとの内訳。ATTENDED_TYPE_VALUES の順（0件の種別も含む）
  countsByType: SongEncounterTypeCount[];
  // 公演一覧。performance_date 降順（null=末尾）
  encounters: SongEncounterSummaryItem[];
};

// 公演内訳は日付降順（null=末尾）。getSetlistCount.ts の並び方と揃える
// （楽曲詳細・ランキングどちらで見ても同じ順序になるようにするため）。
function sortByDateDesc(
  encounters: SongEncounterSummaryItem[]
): SongEncounterSummaryItem[] {
  return [...encounters].sort((a, b) => {
    if (!a.performanceDate && !b.performanceDate) return 0;
    if (!a.performanceDate) return 1;
    if (!b.performanceDate) return -1;
    return b.performanceDate.localeCompare(a.performanceDate);
  });
}

/**
 * 楽曲詳細ページの「あなたの遭遇記録」セクション用（Issue #249）。
 * findSongEncounters() の全件取得結果から、指定した楽曲（trackId）に絞り込んで
 * 件数・種別内訳・公演一覧を求める純粋関数。
 *
 * ランキングの絞り込み（デフォルト onsite のみ）とは異なり、こちらは常に全種別を
 * 対象にする（自分の遭遇記録を漏れなく見せる用途のため）。
 */
export function getSongEncounterSummary(
  encounters: SongEncounter[],
  trackId: string
): SongEncounterSummary {
  const matched = encounters.filter((encounter) => encounter.trackId === trackId);

  const countsByType = ATTENDED_TYPE_VALUES.map((attendedType) => ({
    attendedType,
    count: matched.filter((encounter) => encounter.attendedType === attendedType).length,
  }));

  return {
    count: matched.length,
    countsByType,
    encounters: sortByDateDesc(
      matched.map((encounter) => ({
        performanceId: encounter.performanceId,
        performanceDate: encounter.performanceDate,
        liveId: encounter.liveId,
        liveName: encounter.liveName,
        attendedType: encounter.attendedType,
      }))
    ),
  };
}
