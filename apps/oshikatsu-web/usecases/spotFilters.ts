import { PREFECTURES } from "@/lib/prefectures";
import type { SpotListItem } from "@/types/spot";

export type SpotFilters = {
  sourceType: string;
  subtypeName: string;
  memberId: string;
  prefecture: string;
};

// 種別×サブ種別×メンバーは「同一の出来事」が全条件を満たすときだけマッチさせる。
// スポット単位のフラットな includes 判定にすると、出来事Aの種別と出来事Bの
// メンバーのように、別々の出来事の組み合わせでマッチしてしまう（#294、PR #291 の教訓）。
// 都道府県のみスポット自体の属性のため、この判定には含めずスポット単位で扱う。
function matchesTag(
  tag: SpotListItem["appearanceTags"][number],
  { sourceType, subtypeName, memberId }: Pick<SpotFilters, "sourceType" | "subtypeName" | "memberId">
): boolean {
  if (sourceType !== "" && tag.sourceType !== sourceType) {
    return false;
  }
  if (subtypeName !== "" && tag.subtypeName !== subtypeName) {
    return false;
  }
  if (memberId !== "" && !tag.memberIds.includes(memberId)) {
    return false;
  }
  return true;
}

export function filterSpots(
  spots: SpotListItem[],
  filters: SpotFilters
): SpotListItem[] {
  return spots.filter((spot) => {
    if (filters.prefecture !== "" && spot.prefecture !== filters.prefecture) {
      return false;
    }
    if (
      filters.sourceType === "" &&
      filters.subtypeName === "" &&
      filters.memberId === ""
    ) {
      return true;
    }
    return spot.appearanceTags.some((tag) => matchesTag(tag, filters));
  });
}

// サブ種別フィルタの候補。選択中の種別（未選択なら全種別）に属する
// サブ種別名だけを返す（filterSpots と同じペア単位の判定を共有する）。
export function collectSubtypeOptions(
  spots: SpotListItem[],
  sourceType: string
): string[] {
  const names = new Set<string>();
  for (const spot of spots) {
    for (const tag of spot.appearanceTags) {
      if (
        tag.subtypeName !== null &&
        matchesTag(tag, { sourceType, subtypeName: "", memberId: "" })
      ) {
        names.add(tag.subtypeName);
      }
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "ja"));
}

// 登録済みスポットの出来事に登場するメンバーIDの集合。
// メンバー候補一覧をこれで絞り込むことで、登場しないメンバーを選んで常に0件に
// なる選択肢を出さないようにする。
export function collectSpotMemberIds(spots: SpotListItem[]): Set<string> {
  const memberIds = new Set<string>();
  for (const spot of spots) {
    for (const tag of spot.appearanceTags) {
      for (const memberId of tag.memberIds) {
        memberIds.add(memberId);
      }
    }
  }
  return memberIds;
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
