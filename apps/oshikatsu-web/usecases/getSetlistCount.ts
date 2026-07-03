import type { AttendedType, SongEncounter } from "@/types/attendance";
import type { SongLabel, SongListItem } from "@/types/song";
import {
  filterSongsByGroup,
  filterSongsByLabel,
  filterSongsByTitle,
} from "@/usecases/songSearch";

// セットリストカウント（#249）の絞り込み条件。
// - attendedTypes: 集計対象に含める参加種別。Issue Decision により初期表示は
//   ["onsite"] のみ（LV/配信は絞り込みで追加）
// - groupId / label / query: 楽曲一覧（SongBrowser）と同じ絞り込み関数を再利用し、
//   操作感を揃える
export type SetlistCountFilters = {
  attendedTypes: AttendedType[];
  groupId?: string;
  label?: SongLabel | "";
  query?: string;
};

// ランキング行の公演内訳1件。「どのライブで聴いたか」の展開表示用。
export type SetlistCountEncounter = {
  performanceId: string;
  performanceDate: string | null;
  liveId: string;
  liveName: string;
  attendedType: AttendedType;
};

export type SetlistRankingEntry = {
  song: SongListItem;
  count: number;
  // 公演内訳。performance_date 降順（null=末尾）
  encounters: SetlistCountEncounter[];
};

export type SetlistCountResult = {
  // 遭遇回数の降順。同数はタイトル昇順（Issue #249 実装時の採用仕様）
  ranking: SetlistRankingEntry[];
  // 遭遇回数0回の楽曲。タイトル昇順
  unencountered: SongListItem[];
};

function compareByTitle(a: SongListItem, b: SongListItem): number {
  return a.title.localeCompare(b.title, "ja");
}

// 公演内訳は日付降順（null=末尾）。attendanceRepository の findAllForUser と同じ
// 「null=末尾」の並び方に揃える。
function sortEncountersByDateDesc(
  encounters: SetlistCountEncounter[]
): SetlistCountEncounter[] {
  return [...encounters].sort((a, b) => {
    if (!a.performanceDate && !b.performanceDate) return 0;
    if (!a.performanceDate) return 1;
    if (!b.performanceDate) return -1;
    return b.performanceDate.localeCompare(a.performanceDate);
  });
}

/**
 * 参加記録由来の遭遇データ（SongEncounter[]）と公開楽曲一覧（母集合）から、
 * 楽曲ごとの遭遇回数ランキングと未遭遇リストを求める純粋関数（Issue #249）。
 *
 * - 母集合はグループ・ラベル・タイトルで絞り込む（songSearch.ts の楽曲一覧と
 *   同じ関数を再利用し、操作感を揃える）
 * - 遭遇は attendedTypes でさらに絞り込む（デフォルトは呼び出し側で ["onsite"] を渡す）
 * - 母集合に存在しない track_id の遭遇（非公開曲・削除済み曲等）はスキップする
 */
export function getSetlistCount(
  encounters: SongEncounter[],
  songs: SongListItem[],
  filters: SetlistCountFilters
): SetlistCountResult {
  const population = filterSongsByTitle(
    filterSongsByLabel(
      filterSongsByGroup(songs, filters.groupId ?? ""),
      filters.label ?? ""
    ),
    filters.query ?? ""
  );
  const populationIds = new Set(population.map((song) => song.id));
  const attendedTypeSet = new Set(filters.attendedTypes);

  const encountersBySongId = new Map<string, SetlistCountEncounter[]>();
  for (const encounter of encounters) {
    if (!attendedTypeSet.has(encounter.attendedType)) {
      continue;
    }
    // 母集合（絞り込み後の公開楽曲一覧）に存在しない曲は落とす
    if (!populationIds.has(encounter.trackId)) {
      continue;
    }
    const list = encountersBySongId.get(encounter.trackId) ?? [];
    list.push({
      performanceId: encounter.performanceId,
      performanceDate: encounter.performanceDate,
      liveId: encounter.liveId,
      liveName: encounter.liveName,
      attendedType: encounter.attendedType,
    });
    encountersBySongId.set(encounter.trackId, list);
  }

  const ranking: SetlistRankingEntry[] = [];
  const unencountered: SongListItem[] = [];

  for (const song of population) {
    const list = encountersBySongId.get(song.id);
    if (!list || list.length === 0) {
      unencountered.push(song);
      continue;
    }
    ranking.push({
      song,
      count: list.length,
      encounters: sortEncountersByDateDesc(list),
    });
  }

  ranking.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return compareByTitle(a.song, b.song);
  });
  unencountered.sort(compareByTitle);

  return { ranking, unencountered };
}
