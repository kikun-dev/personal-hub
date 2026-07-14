// スポット出典セレクタ（イベント）用の軽量候補DTO
export type EventOption = {
  id: string;
  title: string;
  date: string;
};

export type Event = {
  id: string;
  eventTypeId: string;
  eventTypeName: string;
  eventTypeColor: string;
  isMemberHistory: boolean;
  title: string;
  description: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  venue: string | null;
  url: string | null;
  groupIds: string[];
  groupNames: string[];
  memberIds: string[];
};

export type CreateEventInput = {
  eventTypeId: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  startTime: string;
  venue: string;
  url: string;
  isMemberHistory: boolean;
  groupIds: string[];
  memberIds: string[];
};

export type UpdateEventInput = CreateEventInput;

export type BirthdayEvent = {
  type: "birthday";
  memberId: string;
  memberName: string;
  date: string;
  age: number | null;
  groupNames: string[];
};

export type LiveCalendarEvent = {
  type: "live";
  id: string;
  liveId: string;
  name: string;
  date: string;
  // Next Events rail（#344）の補足表示用。値が無ければ表示しない。
  startsAt: string | null;
  venueName: string | null;
};

export type ReleaseCalendarEvent = {
  type: "release";
  id: string;
  releaseId: string;
  title: string;
  date: string;
};

// 楽曲に登録した動画（MV・関連動画）の配信日イベント
export type VideoCalendarEvent = {
  type: "video";
  id: string;
  trackId: string;
  trackTitle: string;
  videoLabel: string;
  url: string;
  date: string;
};

export type CalendarEvent =
  | (Event & { type: "event" })
  | BirthdayEvent
  | LiveCalendarEvent
  | ReleaseCalendarEvent
  | VideoCalendarEvent;

// 「今日はなんの日」用（過去の出来事。誕生日は含めない）
export type OnThisDayItem =
  | (Event & { type: "event" })
  | LiveCalendarEvent
  | ReleaseCalendarEvent
  | VideoCalendarEvent;
