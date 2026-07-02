import type {
  Database,
  SelectRows,
  TypedSupabaseClient,
} from "@personal-hub/supabase";
import type { Event } from "@/types/event";
import type { MemberHistory } from "@/types/member";
import type { EventRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";
import {
  extractHttpUrlsFromText,
  splitTrailingPunctuation,
} from "@/lib/linkParser";

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

type EventRow = SelectRows<"orbit_events", typeof EVENT_SELECT>[number];
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

function getMonthRange(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
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
      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { data: event, error: eventError } = await writable
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
        const { error: groupError } = await writable
          .from("orbit_event_groups")
          .insert(
            input.groupIds.map((groupId) => ({
              event_id: event.id,
              group_id: groupId,
            }))
          );
        if (groupError) {
          // 補償処理: グループ登録失敗時は作成したイベントを削除（CASCADE で中間テーブルも削除）
          await writable.from("orbit_events").delete().eq("id", event.id);
          throw new RepositoryError("イベントのグループ登録に失敗しました", groupError);
        }
      }

      if (input.memberIds.length > 0) {
        const { error: memberError } = await writable
          .from("orbit_event_members")
          .insert(
            input.memberIds.map((memberId) => ({
              event_id: event.id,
              member_id: memberId,
            }))
          );
        if (memberError) {
          // 補償処理: メンバー登録失敗時は作成したイベントを削除（CASCADE で中間テーブルも削除）
          await writable.from("orbit_events").delete().eq("id", event.id);
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
      // 生成型上 update_event_with_relations の p_end_date / p_start_time / p_venue /
      // p_url は non-null な string になっているが、これは PostgREST の RPC スカラー引数の
      // 型生成が NULL 許容を反映しない既知の制約であり、関数自体は null を受け付ける。
      // ペイロード側の誤りではないため、ここでは TypedSupabaseClient にせず
      // asWritableClient の返り値（未typed）のまま呼び出す。
      const writable = asWritableClient(supabase);
      const { error: rpcError } = await writable.rpc("update_event_with_relations", {
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
  };
}
