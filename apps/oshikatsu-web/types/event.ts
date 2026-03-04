export type Event = {
  id: string;
  eventTypeId: string;
  eventTypeName: string;
  eventTypeColor: string;
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

export type CalendarEvent =
  | (Event & { type: "event" })
  | BirthdayEvent;
