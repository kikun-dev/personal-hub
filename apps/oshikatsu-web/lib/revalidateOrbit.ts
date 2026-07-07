import { updateTag } from "next/cache";
import { ORBIT_CACHE_TAGS } from "@/lib/cacheTags";

// エンティティ = 管理系 Server Action の更新単位。
type OrbitEntity =
  | "member"
  | "event"
  | "song"
  | "release"
  | "person"
  | "venue"
  | "spot"
  | "live"
  | "wiki";

// 各キャッシュタグが「どのエンティティのデータを表示しているか」の宣言表。
// エンティティを更新すると、そのエンティティを含む行のタグがすべて失効する。
// 画面に新しい参照を追加したら、その画面のタグの行にエンティティを足すだけでよい。
const TAG_DISPLAY_SOURCES: Record<string, readonly OrbitEntity[]> = {
  [ORBIT_CACHE_TAGS.top]: ["member", "event"],
  [ORBIT_CACHE_TAGS.members]: ["member", "event", "song", "release"],
  [ORBIT_CACHE_TAGS.membersDetail]: ["member", "event", "song", "release"],
  [ORBIT_CACHE_TAGS.membersList]: ["member"],
  [ORBIT_CACHE_TAGS.releases]: ["member", "song", "release", "person"],
  [ORBIT_CACHE_TAGS.releasesDetail]: ["release", "person"],
  [ORBIT_CACHE_TAGS.releasesList]: ["member", "song", "release"],
  [ORBIT_CACHE_TAGS.songs]: ["member", "song", "release", "person"],
  [ORBIT_CACHE_TAGS.songsDetail]: [
    "song",
    "release",
    "person",
    // セットリスト編集は楽曲詳細の総披露回数（#281）にも影響する
    "live",
  ],
  [ORBIT_CACHE_TAGS.songsList]: ["member", "song"],
  [ORBIT_CACHE_TAGS.songOptions]: ["song", "release"],
  [ORBIT_CACHE_TAGS.lives]: [
    // ライブ詳細は出演グループ名・休演メンバー名を表示する
    "member",
    // セットリストが楽曲タイトルを参照表示する
    "song",
    // ライブ詳細・公演に会場名を表示する
    "venue",
    "live",
  ],
  [ORBIT_CACHE_TAGS.livesDetail]: [
    // ライブ詳細は出演グループ名・休演メンバー名を表示する
    "member",
    // セットリストが楽曲タイトルを参照表示する
    "song",
    // ライブ詳細・公演に会場名を表示する
    "venue",
    "live",
  ],
  [ORBIT_CACHE_TAGS.people]: ["person"],
  [ORBIT_CACHE_TAGS.venues]: [
    "venue",
    // ライブ更新は会場詳細の公演逆引きにも影響する
    "live",
  ],
  [ORBIT_CACHE_TAGS.spots]: ["spot"],
  [ORBIT_CACHE_TAGS.spotsDetail]: [
    // スポット詳細は出来事のメンバー名を表示する
    "member",
    // スポット詳細は出来事（event）のタイトル・日付を表示する
    "event",
    // スポット詳細は出来事の出典（mv/動画）から楽曲タイトルを表示する
    "song",
    // 地図ビュー（一覧）とスポット詳細ページの両方が参照するため、spots と両方に含める
    "spot",
    // スポット詳細は出来事の出典（live）からライブ名を表示する
    "live",
  ],
  // eventTypes・groups はマスタ表示専用で、現状どの更新系 Server Action からも
  // 失効されない（イベント種別・グループの CRUD UI が無いため）。行として持たない。
  // Wikiページは他エンティティのデータを表示せず、他画面もWiki本文を表示しないため
  // （閉じた単独ドメイン）、"wiki" のみを含む単純な行にする。
  [ORBIT_CACHE_TAGS.wiki]: ["wiki"],
  [ORBIT_CACHE_TAGS.wikiDetail]: ["wiki"],
};

function revalidateOrbitEntity(entity: OrbitEntity): void {
  for (const [tag, entities] of Object.entries(TAG_DISPLAY_SOURCES)) {
    if (entities.includes(entity)) {
      updateTag(tag);
    }
  }
}

export function revalidateOrbitMemberData(): void {
  revalidateOrbitEntity("member");
}

export function revalidateOrbitEventData(): void {
  revalidateOrbitEntity("event");
}

export function revalidateOrbitSongData(): void {
  revalidateOrbitEntity("song");
}

export function revalidateOrbitReleaseData(): void {
  revalidateOrbitEntity("release");
}

export function revalidateOrbitPersonData(): void {
  revalidateOrbitEntity("person");
}

export function revalidateOrbitVenueData(): void {
  revalidateOrbitEntity("venue");
}

export function revalidateOrbitSpotData(): void {
  revalidateOrbitEntity("spot");
}

export function revalidateOrbitLiveData(): void {
  revalidateOrbitEntity("live");
}

export function revalidateOrbitWikiData(): void {
  revalidateOrbitEntity("wiki");
}
