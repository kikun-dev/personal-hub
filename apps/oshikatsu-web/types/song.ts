import type { ReleaseType } from "@/types/release";
import type { Group } from "@/types/group";

export const SONG_LABELS = [
  "title",
  "senbatsu",
  "under",
  "all",
  "solo",
  "unit",
  "generation",
] as const;

export type SongLabel = (typeof SONG_LABELS)[number];

export const SONG_LABEL_LABELS: Record<SongLabel, string> = {
  title: "表題",
  senbatsu: "選抜",
  under: "アンダー",
  all: "全員",
  solo: "ソロ",
  unit: "ユニット",
  generation: "期別",
};

export const SONG_LABEL_BADGE_COLOR = "#8B5CF6";

// アンダーのグループ別表示名（内部値は under 共通）
const UNDER_LABEL_BY_GROUP: Record<string, string> = {
  乃木坂46: "アンダー",
  櫻坂46: "BACKS",
  日向坂46: "ひなた坂",
};

export function isSongLabel(value: string): value is SongLabel {
  return (SONG_LABELS as readonly string[]).includes(value);
}

// 表示用ラベル文字列（under はグループ別、generation は「N期生」）
export function formatSongLabel(
  label: SongLabel | null,
  generation: string | null,
  groupNameJa: string
): string | null {
  if (!label) return null;
  if (label === "under") return UNDER_LABEL_BY_GROUP[groupNameJa] ?? "アンダー";
  if (label === "generation") return generation ? `${generation}期生` : "期別";
  return SONG_LABEL_LABELS[label];
}

export type SongCreditRole = "lyrics" | "music" | "arrangement" | "choreography";

export type SongCredit = {
  role: SongCreditRole;
  personName: string;
  sortOrder: number;
};

export type SongReleaseLink = {
  releaseId: string;
  releaseTitle: string;
  releaseType: ReleaseType;
  numbering: number | null;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  releaseDate: string | null;
  trackNumber: number;
};

export type SongFormationMember = {
  memberId: string;
  memberNameJa: string;
  slotOrder: number;
  isCenter: boolean;
};

export type SongFormationRow = {
  rowNumber: number;
  memberCount: number;
  members: SongFormationMember[];
};

export type SongMv = {
  url: string;
  directorName: string | null;
  location: string | null;
  publishedOn: string | null;
  memo: string | null;
};

export const SONG_VIDEO_TYPES = ["dance_practice", "call"] as const;

export type SongVideoType = (typeof SONG_VIDEO_TYPES)[number];

export const SONG_VIDEO_TYPE_LABELS: Record<SongVideoType, string> = {
  dance_practice: "Dance Practice/ひなリハ",
  call: "コール動画",
};

const DANCE_PRACTICE_LABEL_BY_GROUP: Record<string, string> = {
  櫻坂46: "Dance Practice",
  日向坂46: "ひなリハ",
};

export function isSongVideoType(value: string): value is SongVideoType {
  return (SONG_VIDEO_TYPES as readonly string[]).includes(value);
}

// 生の video_type 文字列（境界由来で未知値がありうる）をラベル化する。
// 未知の値はそのまま返す。グループ別表示（dance_practice）が必要な場面では
// formatSongVideoTypeLabel を使う。
export function getSongVideoTypeLabel(videoType: string): string {
  return isSongVideoType(videoType) ? SONG_VIDEO_TYPE_LABELS[videoType] : videoType;
}

export function formatSongVideoTypeLabel(
  type: SongVideoType,
  groupNameJa: string
): string | null {
  if (type === "dance_practice") {
    return DANCE_PRACTICE_LABEL_BY_GROUP[groupNameJa] ?? null;
  }
  return SONG_VIDEO_TYPE_LABELS[type];
}

// トップのカレンダー/◯年前に出す、楽曲動画（MV・関連動画）の配信日イベント用の生データ
export type CalendarVideoItem = {
  trackId: string;
  trackTitle: string;
  groupNameJa: string;
  videoType: "mv" | SongVideoType;
  url: string;
  date: string;
};

// 楽曲詳細ページの「総披露回数」用（Issue #281）。全ユーザー共通の客観集計であり、
// orbit_setlist_items（item_type='song' かつ track_id が対象楽曲）を
// orbit_live_performances → orbit_lives と辿った1披露=1件の生データ。
// 同一公演内で複数回披露していればその回数分このリストに複数件並ぶ。
export type SongPerformanceOccurrence = {
  performanceId: string;
  performanceDate: string | null;
  liveId: string;
  liveName: string;
};

export type SongVideo = {
  type: SongVideoType;
  url: string;
  publishedOn: string | null;
  memo: string | null;
};

export type SongCostume = {
  id: string;
  stylistName: string;
  imagePath: string;
  note: string | null;
  sortOrder: number;
};

export type Song = {
  id: string;
  title: string;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  label: SongLabel | null;
  generation: string | null;
  releaseDate: string | null;
  representativeReleaseType: ReleaseType | null;
  representativeNumbering: number | null;
  releases: SongReleaseLink[];
  credits: SongCredit[];
  formationRows: SongFormationRow[];
  mv: SongMv | null;
  videos: SongVideo[];
  costumes: SongCostume[];
  // その他楽曲（is_catchall グループ）専用の項目。通常楽曲では null。
  artistName: string | null;
  note: string | null;
};

export type SongListItem = {
  id: string;
  title: string;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  label: SongLabel | null;
  generation: string | null;
  // 所属グループが「その他」受け皿グループ（is_catchall）かどうか。
  // 楽曲一覧・セトリログの「その他も含む」絞り込みに使う。
  isCatchall: boolean;
  releaseCount: number;
  firstReleaseDate: string | null;
  // 一覧の並び替え用：初出（最古）リリースの識別子とトラック番号
  representativeReleaseId: string | null;
  representativeTrackNumber: number | null;
  // 一覧表示用：初出リリースの種別とナンバリング（例: 31st Single / 3rd Album）
  representativeReleaseType: ReleaseType | null;
  representativeNumbering: number | null;
};

export type SongSection = {
  group: Group | null;
  songs: SongListItem[];
};

export type SongOption = {
  id: string;
  title: string;
};

// スポット出典セレクタ（関連動画）用の軽量候補DTO
export type SongVideoOption = {
  id: string;
  trackTitle: string;
  videoType: string;
  publishedOn: string | null;
};

export type CreateSongReleaseLinkInput = {
  releaseId: string;
  trackNumber: string;
};

export type CreateSongFormationRowInput = {
  memberCount: string;
  memberIds: string[];
};

export type CreateSongMvInput = {
  url: string;
  directorName: string;
  location: string;
  publishedOn: string;
  memo: string;
};

export type CreateSongVideoInput = {
  url: string;
  publishedOn: string;
  memo: string;
};

export type CreateSongCostumeInput = {
  stylistName: string;
  imagePath: string;
  note: string;
};

export type CreateSongInput = {
  title: string;
  groupId: string;
  label: string;
  generation: string;
  releaseLinks: CreateSongReleaseLinkInput[];
  lyricsPeople: string;
  musicPeople: string;
  arrangementPeople: string;
  choreographyPeople: string;
  formationRows: CreateSongFormationRowInput[];
  // フォーメーション1列目のセンター（Wセンター可・最大2人）
  centerMemberIds: string[];
  mv: CreateSongMvInput;
  videos: Record<SongVideoType, CreateSongVideoInput>;
  costumes: CreateSongCostumeInput[];
  // その他楽曲（is_catchall グループ）専用の項目。通常楽曲では空文字（保存時にnull化）。
  artistName: string;
  note: string;
};

export type UpdateSongInput = CreateSongInput;

export type SongFilters = {
  groupId?: string;
};
