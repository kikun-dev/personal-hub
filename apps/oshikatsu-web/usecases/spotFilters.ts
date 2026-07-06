import type { SpotListItem } from "@/types/spot";

export type SpotFilters = {
  sourceType: string;
  subtypeName: string;
};

export function filterSpots(
  spots: SpotListItem[],
  filters: SpotFilters
): SpotListItem[] {
  const { sourceType, subtypeName } = filters;

  return spots.filter((spot) => {
    if (
      sourceType !== "" &&
      !(spot.sourceTypes as readonly string[]).includes(sourceType)
    ) {
      return false;
    }
    if (subtypeName !== "" && !spot.subtypeNames.includes(subtypeName)) {
      return false;
    }
    return true;
  });
}
