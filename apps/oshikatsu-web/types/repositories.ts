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
import type { Event, CreateEventInput, UpdateEventInput } from "./event";
import type { EventType } from "./eventType";
import type {
  Song,
  SongOption,
  CreateSongInput,
  UpdateSongInput,
  SongFilters,
  SongListItem,
  CalendarVideoItem,
} from "./song";
import type {
  Person,
  PersonOption,
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
  findActiveMemberIdsByGroups(groupIds: string[], date: string): Promise<string[]>;
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
};

export type EventTypeRepository = {
  findAll(): Promise<EventType[]>;
};

export type PersonRepository = {
  findAll(): Promise<Person[]>;
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

export type LiveCalendarPerformance = {
  liveId: string;
  liveName: string;
  date: string;
};

export type ReleaseCalendarItem = {
  releaseId: string;
  title: string;
  date: string;
};

export type LiveRepository = {
  findPublicList(): Promise<LiveListItem[]>;
  findCalendarPerformances(): Promise<LiveCalendarPerformance[]>;
  findOptions(): Promise<LiveOption[]>;
  findById(id: string): Promise<Live | null>;
  findPerformancesByVenue(venueId: string): Promise<VenuePerformanceSummary[]>;
  create(input: CreateLiveInput): Promise<Live>;
  update(id: string, input: UpdateLiveInput): Promise<Live>;
  delete(id: string): Promise<void>;
};

export type ReleaseRepository = {
  findAll(filters?: ReleaseFilters): Promise<Release[]>;
  findPublicList(filters?: ReleaseFilters): Promise<ReleaseListItem[]>;
  findCalendarItems(): Promise<ReleaseCalendarItem[]>;
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
  create(input: CreateSongInput): Promise<Song>;
  update(id: string, input: UpdateSongInput): Promise<Song>;
  delete(id: string): Promise<void>;
  findByMemberId(memberId: string): Promise<Song[]>;
  findCenterTrackIdsByMemberId(memberId: string): Promise<string[]>;
  findCalendarVideoItems(): Promise<CalendarVideoItem[]>;
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
