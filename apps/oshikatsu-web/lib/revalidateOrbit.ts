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
    ORBIT_CACHE_TAGS.membersDetail,
    ORBIT_CACHE_TAGS.membersList,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.releasesList,
    ORBIT_CACHE_TAGS.songs,
    ORBIT_CACHE_TAGS.songsList,
    ORBIT_CACHE_TAGS.top,
  ]);
}

export function revalidateOrbitEventData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.membersDetail,
    ORBIT_CACHE_TAGS.top,
  ]);
}

export function revalidateOrbitSongData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.membersDetail,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.releasesList,
    ORBIT_CACHE_TAGS.songOptions,
    ORBIT_CACHE_TAGS.songs,
    ORBIT_CACHE_TAGS.songsDetail,
    ORBIT_CACHE_TAGS.songsList,
  ]);
}

export function revalidateOrbitReleaseData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.membersDetail,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.releasesDetail,
    ORBIT_CACHE_TAGS.releasesList,
    ORBIT_CACHE_TAGS.songOptions,
    ORBIT_CACHE_TAGS.songs,
    ORBIT_CACHE_TAGS.songsDetail,
  ]);
}

export function revalidateOrbitPersonData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.people,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.releasesDetail,
    ORBIT_CACHE_TAGS.songs,
    ORBIT_CACHE_TAGS.songsDetail,
  ]);
}
