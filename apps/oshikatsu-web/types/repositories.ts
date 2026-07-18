import type { Group } from "./group";
import type {
  MemberWithGroups,
  MemberHistory,
  CreateMemberInput,
  UpdateMemberInput,
  MemberFilters,
  BirthdayMember,
  MemberListItem,
  MemberOption,
} from "./member";
import type { Event, EventOption, CreateEventInput, UpdateEventInput } from "./event";
import type { EventType } from "./eventType";
import type {
  Song,
  SongOption,
  SongVideoOption,
  CreateSongInput,
  UpdateSongInput,
  SongFilters,
  SongListItem,
  CalendarVideoItem,
  SongPerformanceOccurrence,
} from "./song";
import type {
  Person,
  PersonOption,
  PersonListItem,
  PersonCreditedSong,
  CreatePersonInput,
  UpdatePersonInput,
  EnsurePersonRoleEntry,
} from "./person";
import type {
  Venue,
  VenueOption,
  CreateVenueInput,
  UpdateVenueInput,
} from "./venue";
import type {
  Live,
  LiveListItem,
  LiveOption,
  VenuePerformanceSummary,
  CreateLiveInput,
  UpdateLiveInput,
  ReplaceSetlistInput,
} from "./live";
import type {
  Release,
  CreateReleaseInput,
  UpdateReleaseInput,
  ReleaseFilters,
  ReleaseListItem,
  ReleaseOption,
  MemberSelectionPosition,
} from "./release";
import type {
  LiveAttendance,
  MyAttendanceEntry,
  SongEncounter,
  UpsertAttendanceInput,
} from "./attendance";
import type {
  Spot,
  SpotListItem,
  SpotSourceSubtype,
  CreateSpotInput,
  UpdateSpotInput,
} from "./spot";
import type {
  WikiPage,
  WikiPageListItem,
  CreateWikiPageInput,
  UpdateWikiPageInput,
} from "./wiki";

export type GroupRepository = {
  findAll(): Promise<Group[]>;
  findById(id: string): Promise<Group | null>;
};

export type MemberRepository = {
  findAll(filters?: MemberFilters): Promise<MemberWithGroups[]>;
  findPublicList(filters?: MemberFilters): Promise<MemberListItem[]>;
  findOptions(): Promise<MemberOption[]>;
  findById(id: string): Promise<MemberWithGroups | null>;
  create(input: CreateMemberInput): Promise<MemberWithGroups>;
  update(id: string, input: UpdateMemberInput): Promise<MemberWithGroups>;
  delete(id: string): Promise<void>;
  findBirthdaysByMonth(month: number): Promise<BirthdayMember[]>;
  findBirthdaysByDate(month: number, day: number): Promise<BirthdayMember[]>;
  findAllBirthdays(): Promise<BirthdayMember[]>;
  findActiveMemberIdsByGroups(groupIds: string[], date: string): Promise<string[]>;
};

// Top Page の read 窓。startDate を含み、endDate を含まない。
// exclusive 終端に統一して月境界・Next Events の窓終端を一意に扱う。
export type CalendarDateRange = {
  startDate: string;
  endDate: string;
};

export type EventRepository = {
  findByMonth(year: number, month: number): Promise<Event[]>;
  findByDate(year: number, month: number, day: number): Promise<Event[]>;
  findById(id: string): Promise<Event | null>;
  findHistoryByMemberId(memberId: string): Promise<MemberHistory[]>;
  create(input: CreateEventInput): Promise<Event>;
  update(id: string, input: UpdateEventInput): Promise<Event>;
  delete(id: string): Promise<void>;
  findOnThisDay(month: number, day: number): Promise<Event[]>;
  findCalendarEventsInRanges(ranges: CalendarDateRange[]): Promise<Event[]>;
  // スポットの出典セレクタ（イベント）用の軽量候補一覧
  findOptions(): Promise<EventOption[]>;
};

export type EventTypeRepository = {
  findAll(): Promise<EventType[]>;
};

export type PersonRepository = {
  findAll(): Promise<PersonListItem[]>;
  findOptions(): Promise<PersonOption[]>;
  ensurePeopleRoles(entries: EnsurePersonRoleEntry[]): Promise<void>;
  findCreditedSongsByPersonId(personId: string): Promise<PersonCreditedSong[]>;
  findById(id: string): Promise<Person | null>;
  create(input: CreatePersonInput): Promise<Person>;
  update(id: string, input: UpdatePersonInput): Promise<Person>;
  delete(id: string): Promise<void>;
};

export type VenueRepository = {
  findAll(): Promise<Venue[]>;
  findOptions(): Promise<VenueOption[]>;
  findById(id: string): Promise<Venue | null>;
  create(input: CreateVenueInput): Promise<Venue>;
  update(id: string, input: UpdateVenueInput): Promise<Venue>;
  delete(id: string): Promise<void>;
};

export type SpotRepository = {
  findAll(): Promise<SpotListItem[]>;
  findById(id: string): Promise<Spot | null>;
  create(input: CreateSpotInput): Promise<Spot>;
  update(id: string, input: UpdateSpotInput): Promise<Spot>;
  delete(id: string): Promise<void>;
  // 出来事のサブ種別マスタ一覧（フォームの選択候補用）
  findSubtypeOptions(): Promise<SpotSourceSubtype[]>;
  // Storage 孤児掃除用の軽量クエリ（update/delete 前の旧写真パス取得）
  findPhotoPaths(id: string): Promise<string[]>;
};

// Wiki的静的ページ集（#313 閲覧 / #314 作成・編集）。
export type WikiRepository = {
  findAll(): Promise<WikiPageListItem[]>;
  findBySlug(slug: string): Promise<WikiPage | null>;
  create(input: CreateWikiPageInput): Promise<WikiPage>;
  update(id: string, input: UpdateWikiPageInput): Promise<WikiPage>;
  delete(id: string): Promise<void>;
};

export type LiveCalendarPerformance = {
  id: string;
  liveId: string;
  liveName: string;
  date: string;
  // トップページの Next Events rail（#344）で開演時刻・会場名を補足表示するために追加。
  startsAt: string | null;
  venueName: string | null;
};

export type ReleaseCalendarItem = {
  releaseId: string;
  title: string;
  date: string;
};

export type LiveRepository = {
  findPublicList(): Promise<LiveListItem[]>;
  findCalendarPerformances(): Promise<LiveCalendarPerformance[]>;
  findCalendarPerformancesInRanges(
    ranges: CalendarDateRange[]
  ): Promise<LiveCalendarPerformance[]>;
  findCalendarPerformancesOnThisDay(
    month: number,
    day: number
  ): Promise<LiveCalendarPerformance[]>;
  findOptions(): Promise<LiveOption[]>;
  findById(id: string): Promise<Live | null>;
  findPerformancesByVenue(venueId: string): Promise<VenuePerformanceSummary[]>;
  create(input: CreateLiveInput): Promise<Live>;
  update(id: string, input: UpdateLiveInput): Promise<Live>;
  delete(id: string): Promise<void>;
  replaceSetlist(performanceId: string, input: ReplaceSetlistInput): Promise<void>;
};

export type ReleaseRepository = {
  findAll(filters?: ReleaseFilters): Promise<Release[]>;
  findPublicList(filters?: ReleaseFilters): Promise<ReleaseListItem[]>;
  findCalendarItems(): Promise<ReleaseCalendarItem[]>;
  findCalendarItemsInRanges(
    ranges: CalendarDateRange[]
  ): Promise<ReleaseCalendarItem[]>;
  findCalendarItemsOnThisDay(
    month: number,
    day: number
  ): Promise<ReleaseCalendarItem[]>;
  findOptions(): Promise<ReleaseOption[]>;
  findById(id: string): Promise<Release | null>;
  findSelectionPositionsByMemberId(
    memberId: string
  ): Promise<MemberSelectionPosition[]>;
  create(input: CreateReleaseInput): Promise<Release>;
  update(id: string, input: UpdateReleaseInput): Promise<Release>;
  delete(id: string): Promise<void>;
};

export type SongRepository = {
  findAll(filters?: SongFilters): Promise<Song[]>;
  findPublicList(filters?: SongFilters): Promise<SongListItem[]>;
  findOptions(): Promise<SongOption[]>;
  findById(id: string): Promise<Song | null>;
  // #264: グループが「その他」受け皿（is_catchall）かをDBで権威的に判定する。
  // 検証（validateSong の分岐）と作成/更新の分岐の両方で使う。
  isGroupCatchall(groupId: string): Promise<boolean>;
  create(input: CreateSongInput): Promise<Song>;
  update(id: string, input: UpdateSongInput): Promise<Song>;
  delete(id: string): Promise<void>;
  findByMemberId(memberId: string): Promise<Song[]>;
  findCenterTrackIdsByMemberId(memberId: string): Promise<string[]>;
  findCalendarVideoItems(): Promise<CalendarVideoItem[]>;
  findCalendarVideoItemsInRanges(
    ranges: CalendarDateRange[]
  ): Promise<CalendarVideoItem[]>;
  findCalendarVideoItemsOnThisDay(
    month: number,
    day: number
  ): Promise<CalendarVideoItem[]>;
  // 楽曲詳細ページの「総披露回数」用（Issue #281）。全ユーザー共通の客観集計のため
  // shared read cache 経路（readOrbitMusicData.ts）から呼ぶ。
  findPerformanceOccurrences(songId: string): Promise<SongPerformanceOccurrence[]>;
  // スポットの出典セレクタ（関連動画）用の軽量候補一覧
  findVideoOptions(): Promise<SongVideoOption[]>;
};

// ユーザー別データ（ADR 0009）。findByPerformanceIds / upsert / delete はいずれも
// 「自分の行のみ」が対象だが、それは呼び出し側で user_id を絞るのではなく RLS
// （migration 047: 本人限定 + ロール判定）が担保する。リポジトリの実装は
// TypedSupabaseClient を直接受け取り、グローバルデータ用の OrbitReadClient /
// asWritableClient は使わない（attendanceRepository.ts 冒頭コメント参照）。
export type AttendanceRepository = {
  findByPerformanceIds(performanceIds: string[]): Promise<LiveAttendance[]>;
  // マイページ（#247）用。自分の参加記録全件を、公演・ライブ・会場を合成した
  // read model として取得する（対象は RLS が本人分のみに絞る）。
  findAllForUser(): Promise<MyAttendanceEntry[]>;
  // トップページ「最近の参加記録」（#344/#366）用。beforeDateStr（YYYY-MM-DD）未満かつ
  // 非nullの performance_date を持つ自分の参加記録のみを、日付降順で先頭 limit 件だけ
  // DB 側で絞って取得する（対象は RLS が本人分のみに絞る）。
  findRecentForUser(beforeDateStr: string, limit: number): Promise<MyAttendanceEntry[]>;
  // セットリストカウント（#249）用。自分の参加記録から、セトリの登録曲を
  // 1遭遇=1件に展開した read model を全件取得する（対象は RLS が本人分のみに絞る）。
  findSongEncounters(): Promise<SongEncounter[]>;
  upsert(userId: string, input: UpsertAttendanceInput): Promise<void>;
  delete(performanceId: string): Promise<void>;
};

export type MemberImageRepository = {
  upload(input: {
    objectPath: string;
    body: Uint8Array;
    contentType: string;
    cacheControl: string;
    upsert: boolean;
  }): Promise<void>;
  remove(objectPaths: string[]): Promise<void>;
};

export type ReleaseImageRepository = {
  upload(input: {
    objectPath: string;
    body: Uint8Array;
    contentType: string;
    cacheControl: string;
    upsert: boolean;
  }): Promise<void>;
  remove(objectPaths: string[]): Promise<void>;
};

export type SpotPhotoRepository = {
  upload(input: {
    objectPath: string;
    body: Uint8Array;
    contentType: string;
    cacheControl: string;
    upsert: boolean;
  }): Promise<void>;
  remove(objectPaths: string[]): Promise<void>;
};
