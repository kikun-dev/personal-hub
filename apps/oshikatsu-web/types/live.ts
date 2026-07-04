export const LIVE_TYPE_VALUES = [
  "single",
  "tour",
  "festival",
  "online",
  "other",
] as const;

export type LiveType = (typeof LIVE_TYPE_VALUES)[number];

export const LIVE_TYPE_LABELS: Record<LiveType, string> = {
  single: "単発ライブ",
  tour: "ツアー",
  festival: "フェス",
  online: "配信ライブ",
  other: "その他",
};

export function isLiveType(value: string): value is LiveType {
  return (LIVE_TYPE_VALUES as readonly string[]).includes(value);
}

export type LivePerformerGroup = {
  groupId: string;
  groupNameJa: string;
  groupColor: string;
};

export type LivePerformerMember = {
  memberId: string;
  memberNameJa: string;
  generation: string | null;
};

export const SETLIST_ITEM_TYPE_VALUES = [
  "song",
  "mc",
  "shadow_announcement",
  "vtr",
  "dance_track",
  "overture",
  "other",
] as const;

export type SetlistItemType = (typeof SETLIST_ITEM_TYPE_VALUES)[number];

export const SETLIST_ITEM_TYPE_LABELS: Record<SetlistItemType, string> = {
  song: "楽曲",
  mc: "MC",
  shadow_announcement: "影アナ",
  vtr: "VTR",
  dance_track: "Dance Track",
  overture: "OVERTURE",
  other: "その他",
};

export function isSetlistItemType(value: string): value is SetlistItemType {
  return (SETLIST_ITEM_TYPE_VALUES as readonly string[]).includes(value);
}

// #260: アンコール区分。既存データは全て 'main'（migration 050 でデフォルト付与）。
export const SETLIST_SECTION_VALUES = [
  "main",
  "encore",
  "double_encore",
  "triple_encore",
] as const;

export type SetlistSection = (typeof SETLIST_SECTION_VALUES)[number];

export const SETLIST_SECTION_LABELS: Record<SetlistSection, string> = {
  main: "本編",
  encore: "アンコール",
  double_encore: "Wアンコール",
  triple_encore: "トリプルアンコール",
};

export function isSetlistSection(value: string): value is SetlistSection {
  return (SETLIST_SECTION_VALUES as readonly string[]).includes(value);
}

export const PERFORMANCE_STYLE_VALUES = [
  "full",
  "one_half",
  "interlude_long",
  "other",
] as const;

export type PerformanceStyle = (typeof PERFORMANCE_STYLE_VALUES)[number];

export const PERFORMANCE_STYLE_LABELS: Record<PerformanceStyle, string> = {
  full: "フル",
  one_half: "ワンハーフ",
  interlude_long: "間奏ロング",
  other: "その他",
};

export function isPerformanceStyle(value: string): value is PerformanceStyle {
  return (PERFORMANCE_STYLE_VALUES as readonly string[]).includes(value);
}

export type SetlistMember = {
  memberId: string;
  memberNameJa: string;
  isCenter: boolean;
};

// #260: セトリ楽曲のフォーメーション（表示用）。orbit_track_formations 系
// （types/song.ts の SongFormationRow）に近い形だが、列数（column_count）を
// 持つ中間テーブルが無いため memberCount は持たない（行のメンバー数で足りる）。
export type SetlistFormationMember = {
  memberId: string;
  memberNameJa: string;
};

export type SetlistFormationRow = {
  rowNumber: number;
  members: SetlistFormationMember[];
};

export type SetlistItem = {
  itemType: SetlistItemType;
  trackId: string | null;
  trackTitle: string | null;
  songTitle: string | null;
  note: string | null;
  // 既存の単一値。LiveForm / LiveDetail が単一値のまま動いているため残す（#260）。
  performanceStyle: PerformanceStyle | null;
  // #260: 複数披露タイプ（新配列）。新規参照はこちらを使う。
  performanceStyles: PerformanceStyle[];
  section: SetlistSection;
  costumeNote: string | null;
  formationRows: SetlistFormationRow[];
  members: SetlistMember[];
  position: number;
};

export type LivePerformanceAbsence = {
  memberId: string;
  memberNameJa: string;
  note: string | null;
};

export type LivePerformance = {
  id: string;
  venueId: string | null;
  venueName: string | null;
  venuePrefecture: string | null;
  performanceDate: string | null;
  doorsOpenAt: string | null;
  startsAt: string | null;
  hasStreaming: boolean;
  hasLiveViewing: boolean;
  sortOrder: number;
  absences: LivePerformanceAbsence[];
  setlistItems: SetlistItem[];
};

export type Live = {
  id: string;
  name: string;
  liveType: LiveType;
  description: string | null;
  performerGroups: LivePerformerGroup[];
  performerMembers: LivePerformerMember[];
  performances: LivePerformance[];
};

export type LiveListItem = {
  id: string;
  name: string;
  liveType: LiveType;
  performerGroups: LivePerformerGroup[];
  firstDate: string | null;
  lastDate: string | null;
  performanceCount: number;
};

export type LiveOption = {
  id: string;
  name: string;
};

export type VenuePerformanceSummary = {
  performanceId: string;
  liveId: string;
  liveName: string;
  performanceDate: string | null;
};

export type CreateLivePerformanceAbsenceInput = {
  memberId: string;
  note: string;
};

export type CreateLivePerformanceInput = {
  // 既存公演の編集時のみ設定する（048で公演IDを維持するupsertに使う）。新規公演は未設定。
  id?: string;
  venueId: string;
  performanceDate: string;
  doorsOpenAt: string;
  startsAt: string;
  hasStreaming: boolean;
  hasLiveViewing: boolean;
  absences: CreateLivePerformanceAbsenceInput[];
};

export type CreateLiveInput = {
  name: string;
  liveType: LiveType | "";
  description: string;
  performerGroupIds: string[];
  performerMemberIds: string[];
  performances: CreateLivePerformanceInput[];
};

export type UpdateLiveInput = CreateLiveInput;

// #261: セットリスト編集ビュー用の入力型。公演単位で保存する
// replace_performance_setlist RPC（migration 052）にそのまま対応する。
export type SetlistEditorMemberInput = { memberId: string; isCenter: boolean };
export type SetlistEditorFormationRowInput = { memberIds: string[] };
export type SetlistEditorItemInput = {
  itemType: SetlistItemType;
  trackId: string;
  songTitle: string;
  note: string;
  section: SetlistSection;
  performanceStyles: PerformanceStyle[];
  costumeNote: string;
  members: SetlistEditorMemberInput[];
  formationRows: SetlistEditorFormationRowInput[];
};
export type ReplaceSetlistInput = { items: SetlistEditorItemInput[] };
