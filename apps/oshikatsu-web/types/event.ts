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
};

export type ReleaseCalendarEvent = {
  type: "release";
  id: string;
  releaseId: string;
  title: string;
  date: string;
};

export type CalendarEvent =
  | (Event & { type: "event" })
  | BirthdayEvent
  | LiveCalendarEvent
  | ReleaseCalendarEvent;

// 「今日はなんの日」用（過去の出来事。誕生日は含めない）
export type OnThisDayItem =
  | (Event & { type: "event" })
  | LiveCalendarEvent
  | ReleaseCalendarEvent;
