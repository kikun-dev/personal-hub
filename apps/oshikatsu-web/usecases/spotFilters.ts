import type { SpotListItem } from "@/types/spot";

export type SpotFilters = {
  sourceType: string;
  subtypeName: string;
};

// 種別×サブ種別は「同一の出来事」が両方を満たすときだけマッチさせる。
// スポット単位のフラットな includes 判定にすると、種別Aの出来事と
// 種別Bのサブ種別を持つ別の出来事が組み合わさってマッチしてしまう。
function matchesTag(
  tag: SpotListItem["appearanceTags"][number],
  { sourceType, subtypeName }: SpotFilters
): boolean {
  if (sourceType !== "" && tag.sourceType !== sourceType) {
    return false;
  }
  if (subtypeName !== "" && tag.subtypeName !== subtypeName) {
    return false;
  }
  return true;
}

export function filterSpots(
  spots: SpotListItem[],
  filters: SpotFilters
): SpotListItem[] {
  if (filters.sourceType === "" && filters.subtypeName === "") {
    return spots;
  }
  return spots.filter((spot) =>
    spot.appearanceTags.some((tag) => matchesTag(tag, filters))
  );
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
        matchesTag(tag, { sourceType, subtypeName: "" })
      ) {
        names.add(tag.subtypeName);
      }
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "ja"));
}
