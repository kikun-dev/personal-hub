export const LIVE_TYPE_VALUES = ["live", "festival", "online", "other"] as const;

export type LiveType = (typeof LIVE_TYPE_VALUES)[number];

export const LIVE_TYPE_LABELS: Record<LiveType, string> = {
  live: "ライブ",
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

export type SetlistItem = {
  itemType: SetlistItemType;
  trackId: string | null;
  trackTitle: string | null;
  songTitle: string | null;
  note: string | null;
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
  performanceDate: string | null;
  doorsOpenAt: string | null;
  startsAt: string | null;
  sessionLabel: string | null;
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
  sessionLabel: string | null;
};

export type CreateLivePerformanceAbsenceInput = {
  memberId: string;
  note: string;
};

export type CreateSetlistItemInput = {
  itemType: SetlistItemType;
  trackId: string;
  songTitle: string;
  note: string;
};

export type CreateLivePerformanceInput = {
  venueId: string;
  performanceDate: string;
  doorsOpenAt: string;
  startsAt: string;
  sessionLabel: string;
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
