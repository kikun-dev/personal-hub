import type { LiveListItem } from "@/types/live";

export function filterLivesByGroup(
  lives: LiveListItem[],
  groupId: string
): LiveListItem[] {
  if (groupId === "") {
    return lives;
  }
  return lives.filter((live) =>
    live.performerGroups.some((group) => group.groupId === groupId)
  );
}
