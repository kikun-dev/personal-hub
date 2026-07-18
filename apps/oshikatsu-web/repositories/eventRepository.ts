import type {
  Database,
  SelectRows,
  TypedSupabaseClient,
} from "@personal-hub/supabase";
import type {
  CreateEventInput,
  Event,
  EventOption,
  UpdateEventInput,
} from "@/types/event";
import type { MemberHistory } from "@/types/member";
import type { EventRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";
import {
  extractHttpUrlsFromText,
  splitTrailingPunctuation,
} from "@/lib/linkParser";
import { buildCalendarDateRangeFilter } from "./calendarDateRanges";

const EVENT_SELECT = `
  *,
  orbit_event_types(name, color),
  orbit_event_groups(group_id, orbit_groups(name_ja)),
  orbit_event_members(member_id)
` as const;

const EVENT_SUMMARY_SELECT = `
  id,
  event_type_id,
  is_member_history,
  title,
  date,
  end_date,
  start_time,
  venue,
  orbit_event_types(name, color),
  orbit_event_groups(group_id, orbit_groups(name_ja))
` as const;

const EVENT_HISTORY_SELECT = `
  id,
  date,
  title,
  description,
  url,
  orbit_event_members!inner(member_id)
` as const;

const EVENT_OPTION_SELECT = "id, title, date" as const;

type EventRow = SelectRows<"orbit_events", typeof EVENT_SELECT>[number];
type EventOptionRow = SelectRows<
  "orbit_events",
  typeof EVENT_OPTION_SELECT
>[number];
type EventSummaryRow = SelectRows<
  "orbit_events",
  typeof EVENT_SUMMARY_SELECT
>[number];
type EventHistoryRow = SelectRows<
  "orbit_events",
  typeof EVENT_HISTORY_SELECT
>[number];
type OnThisDayEventRow =
  Database["public"]["Functions"]["find_orbit_events_on_this_day"]["Returns"][number];

function normalizeUrlForCompare(value: string): string {
  const trimmed = splitTrailingPunctuation(value.trim()).cleanUrl;
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = parsed.pathname.replace(/\/+$/g, "") || "/";
    return `${parsed.protocol}//${parsed.host}${normalizedPath}${parsed.search}${parsed.hash}`;
  } catch {
    return trimmed;
  }
}

function mapToEvent(row: EventRow): Event {
  const eventType = row.orbit_event_types;
  const eventGroups = row.orbit_event_groups;

  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    eventTypeName: eventType?.name ?? "",
    eventTypeColor: eventType?.color ?? "#6B7280",
    isMemberHistory: row.is_member_history,
    title: row.title,
    description: row.description,
    date: row.date,
    endDate: row.end_date,
    startTime: row.start_time,
    venue: row.venue,
    url: row.url,
    groupIds: eventGroups.map((group) => group.group_id),
    groupNames: eventGroups.map((group) => group.orbit_groups?.name_ja ?? ""),
    memberIds: row.orbit_event_members.map((m) => m.member_id),
  };
}

function mapToMemberHistory(row: EventHistoryRow): MemberHistory {
  const description = row.description.trim();
  const noteParts = description ? [description] : [];
  const eventUrl = row.url?.trim() ?? "";

  if (eventUrl) {
    const normalizedEventUrl = normalizeUrlForCompare(eventUrl);
    const urlsInDescription = new Set(
      extractHttpUrlsFromText(description).map(normalizeUrlForCompare)
    );
    if (!urlsInDescription.has(normalizedEventUrl)) {
      noteParts.push(eventUrl);
    }
  }

  return {
    id: row.id,
    date: row.date,
    event: row.title,
    note: noteParts.join("\n"),
  };
}

function mapToEventSummary(row: EventSummaryRow): Event {
  const eventType = row.orbit_event_types;
  const eventGroups = row.orbit_event_groups;

  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    eventTypeName: eventType?.name ?? "",
    eventTypeColor: eventType?.color ?? "#6B7280",
    isMemberHistory: row.is_member_history,
    title: row.title,
    description: "",
    date: row.date,
    endDate: row.end_date,
    startTime: row.start_time,
    venue: row.venue,
    url: null,
    groupIds: eventGroups.map((group) => group.group_id),
    groupNames: eventGroups.map((group) => group.orbit_groups?.name_ja ?? ""),
    memberIds: [],
  };
}

function mapToOnThisDayEvent(row: OnThisDayEventRow): Event {
  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    eventTypeName: row.event_type_name,
    eventTypeColor: row.event_type_color,
    isMemberHistory: row.is_member_history,
    title: row.title,
    description: "",
    date: row.date,
    endDate: row.end_date,
    startTime: row.start_time,
    venue: row.venue,
    url: null,
    groupIds: row.group_ids ?? [],
    groupNames: row.group_names ?? [],
    memberIds: [],
  };
}

function mapToEventOption(row: EventOptionRow): EventOption {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
  };
}

function getMonthRange(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

// #304: upsert_orbit_event（migration 060）用のペイロード整形。
// description は空文字→NULL変換をしない（RPC側は COALESCE(..., '') を使う）。
// end_date/start_time/venue/url の空文字→NULL変換はRPC側のNULLIFが行う。
function toEventPayload(input: CreateEventInput | UpdateEventInput) {
  return {
    event_type_id: input.eventTypeId,
    title: input.title,
    description: input.description,
    is_member_history: input.isMemberHistory,
    date: input.date,
    end_date: input.endDate,
    start_time: input.startTime,
    venue: input.venue,
    url: input.url,
    group_ids: input.groupIds,
    member_ids: input.memberIds,
  };
}

export function createEventRepository(
  supabase: OrbitReadClient
): EventRepository {
  return {
    async findByMonth(year, month) {
      const { startDate, endDate } = getMonthRange(year, month);

      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_SUMMARY_SELECT)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")
        .order("start_time", { nullsFirst: false });

      if (error) {
        throw new RepositoryError("イベントの取得に失敗しました", error);
      }
      return data.map(mapToEventSummary);
    },

    async findByDate(year, month, day) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_SUMMARY_SELECT)
        .eq("date", dateStr)
        .order("start_time", { nullsFirst: false });

      if (error) {
        throw new RepositoryError("イベントの取得に失敗しました", error);
      }
      return data.map(mapToEventSummary);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("イベントの取得に失敗しました", error);
      }
      return mapToEvent(data);
    },

    async findHistoryByMemberId(memberId) {
      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_HISTORY_SELECT)
        .eq("is_member_history", true)
        .eq("orbit_event_members.member_id", memberId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        throw new RepositoryError("メンバー来歴イベントの取得に失敗しました", error);
      }

      return data.map(mapToMemberHistory);
    },

    async create(input) {
      // upsert_orbit_event の p_id は生成型上 non-null な string になっているが、create
      // では新規作成のため p_id: null を送る必要がある（関数は null を「新規作成」の合図
      // として受け付ける）。生成型がこのケースを表現できない既知の制約のため、
      // TypedSupabaseClient にせず asWritableClient の返り値（未typed）のまま呼び出す。
      const writable = asWritableClient(supabase);
      const { data, error } = await writable.rpc("upsert_orbit_event", {
        p_id: null,
        p_payload: toEventPayload(input),
      });

      if (error) {
        throw new RepositoryError("イベントの作成に失敗しました", error);
      }

      const created = await this.findById(data as string);
      if (!created) {
        throw new RepositoryError("作成したイベントの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      // update では p_id に既存の非null文字列idを渡すため実ペイロードと生成型 Args が
      // 一致する。typed client で呼び出す。
      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { error } = await writable.rpc("upsert_orbit_event", {
        p_id: id,
        p_payload: toEventPayload(input),
      });

      if (error) {
        throw new RepositoryError("イベントの更新に失敗しました", error);
      }

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新したイベントの取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const writable = asWritableClient(supabase);
      const { error } = await writable
        .from("orbit_events")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("イベントの削除に失敗しました", error);
      }
    },

    async findOnThisDay(month, day) {
      const { data, error } = await supabase.rpc("find_orbit_events_on_this_day", {
          target_month: month,
          target_day: day,
        });

      if (error) {
        throw new RepositoryError("過去のイベントの取得に失敗しました", error);
      }

      return data.map(mapToOnThisDayEvent);
    },

    async findCalendarEventsInRanges(ranges) {
      if (ranges.length === 0) return [];

      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_SUMMARY_SELECT)
        .or(buildCalendarDateRangeFilter("date", ranges))
        .order("date")
        .order("start_time", { nullsFirst: false });

      if (error) {
        throw new RepositoryError("イベントの取得に失敗しました", error);
      }

      return data.map(mapToEventSummary);
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_OPTION_SELECT)
        .order("date", { ascending: false });

      if (error) {
        throw new RepositoryError("イベント候補の取得に失敗しました", error);
      }

      return data.map(mapToEventOption);
    },
  };
}
