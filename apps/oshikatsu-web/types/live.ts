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
};

export const SETLIST_ITEM_TYPE_VALUES = [
  "song",
  "mc",
  "shadow_announcement",
  "vtr",
  "other",
] as const;

export type SetlistItemType = (typeof SETLIST_ITEM_TYPE_VALUES)[number];

export const SETLIST_ITEM_TYPE_LABELS: Record<SetlistItemType, string> = {
  song: "楽曲",
  mc: "MC",
  shadow_announcement: "影アナ",
  vtr: "VTR",
  other: "その他",
};

export function isSetlistItemType(value: string): value is SetlistItemType {
  return (SETLIST_ITEM_TYPE_VALUES as readonly string[]).includes(value);
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

export type SetlistItem = {
  itemType: SetlistItemType;
  trackId: string | null;
  trackTitle: string | null;
  songTitle: string | null;
  note: string | null;
  performanceStyle: PerformanceStyle | null;
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
  ticketInfo: string | null;
  seatInfo: string | null;
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
  performerGroupNames: string[];
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

export type CreateSetlistMemberInput = {
  memberId: string;
  isCenter: boolean;
};

export type CreateSetlistItemInput = {
  itemType: SetlistItemType;
  trackId: string;
  songTitle: string;
  note: string;
  performanceStyle: PerformanceStyle | "";
  members: CreateSetlistMemberInput[];
};

export type CreateLivePerformanceInput = {
  venueId: string;
  performanceDate: string;
  doorsOpenAt: string;
  startsAt: string;
  hasStreaming: boolean;
  hasLiveViewing: boolean;
  ticketInfo: string;
  seatInfo: string;
  absences: CreateLivePerformanceAbsenceInput[];
  setlistItems: CreateSetlistItemInput[];
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
