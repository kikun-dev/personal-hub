import { updateTag } from "next/cache";
import { ORBIT_CACHE_TAGS } from "@/lib/cacheTags";

function revalidateOrbitTags(tags: readonly string[]): void {
  for (const tag of tags) {
    updateTag(tag);
  }
}

export function revalidateOrbitMemberData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.songs,
    ORBIT_CACHE_TAGS.top,
  ]);
}

export function revalidateOrbitEventData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.top,
  ]);
}

export function revalidateOrbitSongData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.songOptions,
    ORBIT_CACHE_TAGS.songs,
  ]);
}

export function revalidateOrbitReleaseData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.songOptions,
    ORBIT_CACHE_TAGS.songs,
  ]);
}
