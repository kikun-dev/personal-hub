import type { SupabaseClient } from "@personal-hub/supabase";
import type { Event } from "@/types/event";
import type { MemberHistory } from "@/types/member";
import type { EventRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";
import {
  extractHttpUrlsFromText,
  splitTrailingPunctuation,
} from "@/lib/linkParser";

type EventRow = {
  id: string;
  event_type_id: string;
  orbit_event_types:
    | {
        name: string;
        color: string;
      }
    | Array<{
        name: string;
        color: string;
      }>;
  is_member_history: boolean;
  title: string;
  description: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  venue: string | null;
  url: string | null;
  orbit_event_groups: {
    group_id: string;
    orbit_groups:
      | { name_ja: string }
      | Array<{ name_ja: string }>;
  }[];
  orbit_event_members: {
    member_id: string;
  }[];
};

type EventSummaryRow = {
  id: string;
  event_type_id: string;
  orbit_event_types:
    | {
        name: string;
        color: string;
      }
    | Array<{
        name: string;
        color: string;
      }>;
  is_member_history: boolean;
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  venue: string | null;
  orbit_event_groups: {
    group_id: string;
    orbit_groups:
      | { name_ja: string }
      | Array<{ name_ja: string }>;
  }[];
};

type OnThisDayEventRow = {
  id: string;
  event_type_id: string;
  event_type_name: string;
  event_type_color: string;
  is_member_history: boolean;
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  venue: string | null;
  group_ids: string[] | null;
  group_names: string[] | null;
};

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

function pickFirst<T>(value: T | T[]): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function mapToEvent(row: EventRow): Event {
  const eventType = pickFirst(row.orbit_event_types);
  const eventGroups = row.orbit_event_groups ?? [];

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
    groupNames: eventGroups.map(
      (group) => pickFirst(group.orbit_groups)?.name_ja ?? ""
    ),
    memberIds: (row.orbit_event_members ?? []).map((m) => m.member_id),
  };
}

function mapToMemberHistory(row: Pick<EventRow, "id" | "date" | "title" | "description" | "url">): MemberHistory {
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

const EVENT_SELECT = `
  *,
  orbit_event_types(name, color),
  orbit_event_groups(group_id, orbit_groups(name_ja)),
  orbit_event_members(member_id)
`;

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
`;

function mapToEventSummary(row: EventSummaryRow): Event {
  const eventType = pickFirst(row.orbit_event_types);
  const eventGroups = row.orbit_event_groups ?? [];

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
    groupNames: eventGroups.map(
      (group) => pickFirst(group.orbit_groups)?.name_ja ?? ""
    ),
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

function getMonthRange(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

export function createEventRepository(
  supabase: SupabaseClient
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
      return (data as EventSummaryRow[]).map(mapToEventSummary);
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
      return (data as EventSummaryRow[]).map(mapToEventSummary);
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
      return mapToEvent(data as EventRow);
    },

    async findHistoryByMemberId(memberId) {
      const { data, error } = await supabase
        .from("orbit_events")
        .select(`
          id,
          date,
          title,
          description,
          url,
          orbit_event_members!inner(member_id)
        `)
        .eq("is_member_history", true)
        .eq("orbit_event_members.member_id", memberId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        throw new RepositoryError("メンバー来歴イベントの取得に失敗しました", error);
      }

      return (data as Array<Pick<EventRow, "id" | "date" | "title" | "description" | "url">>)
        .map(mapToMemberHistory);
    },

    async create(input) {
      const { data: event, error: eventError } = await supabase
        .from("orbit_events")
        .insert({
          event_type_id: input.eventTypeId,
          title: input.title,
          description: input.description || "",
          is_member_history: input.isMemberHistory,
          date: input.date,
          end_date: input.endDate || null,
          start_time: input.startTime || null,
          venue: input.venue || null,
          url: input.url || null,
        })
        .select("id")
        .single();

      if (eventError) {
        throw new RepositoryError("イベントの作成に失敗しました", eventError);
      }

      if (input.groupIds.length > 0) {
        const { error: groupError } = await supabase
          .from("orbit_event_groups")
          .insert(
            input.groupIds.map((groupId) => ({
              event_id: event.id,
              group_id: groupId,
            }))
          );
        if (groupError) {
          // 補償処理: グループ登録失敗時は作成したイベントを削除（CASCADE で中間テーブルも削除）
          await supabase.from("orbit_events").delete().eq("id", event.id);
          throw new RepositoryError("イベントのグループ登録に失敗しました", groupError);
        }
      }

      if (input.memberIds.length > 0) {
        const { error: memberError } = await supabase
          .from("orbit_event_members")
          .insert(
            input.memberIds.map((memberId) => ({
              event_id: event.id,
              member_id: memberId,
            }))
          );
        if (memberError) {
          // 補償処理: メンバー登録失敗時は作成したイベントを削除（CASCADE で中間テーブルも削除）
          await supabase.from("orbit_events").delete().eq("id", event.id);
          throw new RepositoryError("イベントのメンバー登録に失敗しました", memberError);
        }
      }

      const created = await this.findById(event.id);
      if (!created) {
        throw new RepositoryError("作成したイベントの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const { error: rpcError } = await supabase.rpc("update_event_with_relations", {
        p_event_id: id,
        p_event_type_id: input.eventTypeId,
        p_title: input.title,
        p_description: input.description || "",
        p_is_member_history: input.isMemberHistory,
        p_date: input.date,
        p_end_date: input.endDate || null,
        p_start_time: input.startTime || null,
        p_venue: input.venue || null,
        p_url: input.url || null,
        p_group_ids: input.groupIds,
        p_member_ids: input.memberIds,
      });

      if (rpcError) {
        throw new RepositoryError("イベントの更新に失敗しました", rpcError);
      }

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新したイベントの取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const { error } = await supabase
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

      return ((data as OnThisDayEventRow[] | null) ?? []).map(mapToOnThisDayEvent);
    },
  };
}
