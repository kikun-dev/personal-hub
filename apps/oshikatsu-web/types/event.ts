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
  // 同一ライブ・同一日の複数公演（昼夜公演など）を集約した結果:
  // startsAt = 非nullの最早開演時刻（全て null なら null）
  // venueName = 全公演で同一（かつ非null）の場合のみ、混在/null混じりは null
  startsAt: string | null;
  venueName: string | null;
  // 集約された公演数（同一ライブ・同一日）。2以上のときのみ「全N公演」を補足表示する。
  performanceCount: number;
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
