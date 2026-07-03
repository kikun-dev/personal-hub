import type { MyAttendanceEntry } from "@/types/attendance";

// 会場ごとの訪問公演1件。「いつ・どのライブで行ったか」の展開表示用。
export type VenueVisit = {
  performanceDate: string | null;
  liveId: string;
  liveName: string;
};

export type VenueVisitEntry = {
  venueId: string;
  venueName: string;
  venuePrefecture: string | null;
  count: number;
  // 訪問公演一覧。performance_date 降順（null=末尾）
  visits: VenueVisit[];
};

export type VenueVisitStats = {
  // 訪問回数の降順。同数は会場名昇順（Issue #250 実装時の採用仕様、#249 のランキングと揃える）
  entries: VenueVisitEntry[];
  totalVenues: number;
  totalVisits: number;
  // 会場未設定（venueId null）の現地参加記録の件数。集計対象外だが、
  // 表示側の注記（「n件は集計に含まれていません」）用に返す。
  unknownVenueCount: number;
};

// 訪問公演は日付降順（null=末尾）。attendanceRepository.findAllForUser /
// getSetlistCount.ts と同じ「null=末尾」の並び方に揃える。
function sortVisitsByDateDesc(visits: VenueVisit[]): VenueVisit[] {
  return [...visits].sort((a, b) => {
    if (!a.performanceDate && !b.performanceDate) return 0;
    if (!a.performanceDate) return 1;
    if (!b.performanceDate) return -1;
    return b.performanceDate.localeCompare(a.performanceDate);
  });
}

/**
 * 参加記録（MyAttendanceEntry[]）から、会場ごとの訪問回数ランキングを求める
 * 純粋関数（Issue #250）。
 *
 * 集計対象は `attendedType === "onsite"` かつ `venueId` 非null の記録のみに限定する。
 * LV（ライブビューイング）・配信は実際にはその会場に行っていない（映画館等にいる）ため、
 * 会場訪問としてカウントすると実態とずれる。この点は #249 のセットリストカウント
 * （全参加種別を対象にできる）とは扱いが異なる仕様として Issue #250 Decision で明記されている。
 * 会場が未設定の現地参加記録（venueId が null）も集計対象外とし、件数のみ
 * unknownVenueCount として返す。
 */
export function getVenueVisitStats(entries: MyAttendanceEntry[]): VenueVisitStats {
  const onsiteEntries = entries.filter((entry) => entry.attendedType === "onsite");

  let unknownVenueCount = 0;
  const byVenue = new Map<string, VenueVisitEntry>();

  for (const entry of onsiteEntries) {
    if (!entry.venueId) {
      unknownVenueCount += 1;
      continue;
    }

    const visit: VenueVisit = {
      performanceDate: entry.performanceDate,
      liveId: entry.liveId,
      liveName: entry.liveName,
    };

    const existing = byVenue.get(entry.venueId);
    if (existing) {
      existing.count += 1;
      existing.visits.push(visit);
      continue;
    }

    byVenue.set(entry.venueId, {
      venueId: entry.venueId,
      // venue_id が非null（FK制約）の行は必ず埋め込みの会場行を伴うため実質常に非null。
      // 型上のnullのみ、想定外値として空文字にフォールバックする。
      venueName: entry.venueName ?? "",
      venuePrefecture: entry.venuePrefecture,
      count: 1,
      visits: [visit],
    });
  }

  const venueEntries = Array.from(byVenue.values()).map((entry) => ({
    ...entry,
    visits: sortVisitsByDateDesc(entry.visits),
  }));

  venueEntries.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.venueName.localeCompare(b.venueName, "ja");
  });

  return {
    entries: venueEntries,
    totalVenues: venueEntries.length,
    totalVisits: onsiteEntries.length - unknownVenueCount,
    unknownVenueCount,
  };
}
