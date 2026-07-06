import { PREFECTURES } from "@/lib/prefectures";
import type { SpotListItem } from "@/types/spot";

// 種別は「いずれかの出来事が該当」で判定する（出来事単位、#294）。
export function filterSpotsBySourceType(
  spots: SpotListItem[],
  sourceType: string
): SpotListItem[] {
  if (sourceType === "") {
    return spots;
  }
  return spots.filter((spot) =>
    spot.appearanceTags.some((tag) => tag.sourceType === sourceType)
  );
}

// 都道府県はスポット自体の属性のためスポット単位で判定する。
export function filterSpotsByPrefecture(
  spots: SpotListItem[],
  prefecture: string
): SpotListItem[] {
  if (prefecture === "") {
    return spots;
  }
  return spots.filter((spot) => spot.prefecture === prefecture);
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

// テキスト検索: スポット名・サブ種別名・メンバー名を横断する部分一致
// （大文字小文字無視。songSearch.ts のタイトル検索と同方式）。
// 構造化フィルタ（種別）と違い出来事単位のペアは要求せず、スポット単位で
// 「どこかに当たれば表示」する検索として振る舞う（選択肢が多くなりすぎる
// サブ種別・メンバーの select を置き換える導線。#299 レビュー）。
export function searchSpots(
  spots: SpotListItem[],
  query: string,
  memberNameById: ReadonlyMap<string, string>
): SpotListItem[] {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery === "") {
    return spots;
  }

  return spots.filter((spot) => {
    if (spot.name.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    return spot.appearanceTags.some((tag) => {
      if (
        tag.subtypeName !== null &&
        tag.subtypeName.toLowerCase().includes(normalizedQuery)
      ) {
        return true;
      }
      return tag.memberIds.some((memberId) =>
        (memberNameById.get(memberId) ?? "")
          .toLowerCase()
          .includes(normalizedQuery)
      );
    });
  });
}

// 都道府県フィルタの候補。登録済みスポットの都道府県（非null）を重複排除し、
// PREFECTURES の並び順 → リスト外（海外等）は末尾に五十音順で返す。
export function collectSpotPrefectures(spots: SpotListItem[]): string[] {
  const prefectures = new Set<string>();
  for (const spot of spots) {
    if (spot.prefecture !== null) {
      prefectures.add(spot.prefecture);
    }
  }

  const known: string[] = [];
  const others: string[] = [];
  for (const prefecture of prefectures) {
    if ((PREFECTURES as readonly string[]).includes(prefecture)) {
      known.push(prefecture);
    } else {
      others.push(prefecture);
    }
  }

  known.sort(
    (a, b) =>
      (PREFECTURES as readonly string[]).indexOf(a) -
      (PREFECTURES as readonly string[]).indexOf(b)
  );
  others.sort((a, b) => a.localeCompare(b, "ja"));

  return [...known, ...others];
}
