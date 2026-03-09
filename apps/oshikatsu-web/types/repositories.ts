import type { Group } from "./group";
import type {
  MemberWithGroups,
  MemberHistory,
  CreateMemberInput,
  UpdateMemberInput,
  MemberFilters,
} from "./member";
import type { Event, CreateEventInput, UpdateEventInput } from "./event";
import type { EventType } from "./eventType";
import type {
  Song,
  SongOption,
  CreateSongInput,
  UpdateSongInput,
  SongFilters,
} from "./song";
import type { Person } from "./person";
import type {
  Release,
  CreateReleaseInput,
  UpdateReleaseInput,
  ReleaseFilters,
} from "./release";

export type GroupRepository = {
  findAll(): Promise<Group[]>;
  findById(id: string): Promise<Group | null>;
};

export type MemberRepository = {
  findAll(filters?: MemberFilters): Promise<MemberWithGroups[]>;
  findById(id: string): Promise<MemberWithGroups | null>;
  create(input: CreateMemberInput): Promise<MemberWithGroups>;
  update(id: string, input: UpdateMemberInput): Promise<MemberWithGroups>;
  delete(id: string): Promise<void>;
  findBirthdaysByMonth(month: number): Promise<MemberWithGroups[]>;
  findBirthdaysByDate(month: number, day: number): Promise<MemberWithGroups[]>;
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
};

export type ReleaseRepository = {
  findAll(filters?: ReleaseFilters): Promise<Release[]>;
  findById(id: string): Promise<Release | null>;
  create(input: CreateReleaseInput): Promise<Release>;
  update(id: string, input: UpdateReleaseInput): Promise<Release>;
  delete(id: string): Promise<void>;
};

export type SongRepository = {
  findAll(filters?: SongFilters): Promise<Song[]>;
  findOptions(): Promise<SongOption[]>;
  findById(id: string): Promise<Song | null>;
  create(input: CreateSongInput): Promise<Song>;
  update(id: string, input: UpdateSongInput): Promise<Song>;
  delete(id: string): Promise<void>;
  findByMemberId(memberId: string): Promise<Song[]>;
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
