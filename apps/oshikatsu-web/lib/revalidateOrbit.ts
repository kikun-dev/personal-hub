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
    // ライブ詳細は出演グループ名・休演メンバー名を表示するため失効する
    ORBIT_CACHE_TAGS.lives,
    ORBIT_CACHE_TAGS.livesDetail,
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
    // セットリストが楽曲タイトルを参照表示するため失効する
    ORBIT_CACHE_TAGS.lives,
    ORBIT_CACHE_TAGS.livesDetail,
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

export function revalidateOrbitVenueData(): void {
  // ライブ詳細・公演に会場名を表示するため失効する
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.venues,
    ORBIT_CACHE_TAGS.lives,
    ORBIT_CACHE_TAGS.livesDetail,
  ]);
}

export function revalidateOrbitSpotData(): void {
  // 現時点では管理CRUDのみで閲覧導線が無いため実質未参照だが、地図ビュー
  // （PR③で追加予定）から参照されるようになる前提でタグ自体は先行整備する。
  revalidateOrbitTags([ORBIT_CACHE_TAGS.spots, ORBIT_CACHE_TAGS.spotsDetail]);
}

export function revalidateOrbitLiveData(): void {
  // ライブ更新は会場詳細の公演逆引きにも影響する。
  // セットリスト編集は楽曲詳細の総披露回数（#281）にも影響するため songsDetail も失効する
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.lives,
    ORBIT_CACHE_TAGS.livesDetail,
    ORBIT_CACHE_TAGS.venues,
    ORBIT_CACHE_TAGS.songsDetail,
  ]);
}
