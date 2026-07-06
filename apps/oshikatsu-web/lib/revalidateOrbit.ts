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
    // スポット詳細は出来事のメンバー名を表示するため失効する
    ORBIT_CACHE_TAGS.spotsDetail,
  ]);
}

export function revalidateOrbitEventData(): void {
  revalidateOrbitTags([
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.membersDetail,
    ORBIT_CACHE_TAGS.top,
    // スポット詳細は出来事（event）のタイトル・日付を表示するため失効する
    ORBIT_CACHE_TAGS.spotsDetail,
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
    // スポット詳細は出来事の出典（mv/動画）から楽曲タイトルを表示するため失効する
    ORBIT_CACHE_TAGS.spotsDetail,
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
  // 地図ビュー（一覧）とスポット詳細ページの両方が参照するため両タグを失効する
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
    // スポット詳細は出来事の出典（live）からライブ名を表示するため失効する
    ORBIT_CACHE_TAGS.spotsDetail,
  ]);
}
