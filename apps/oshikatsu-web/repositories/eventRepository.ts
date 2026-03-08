import type { SupabaseClient } from "@personal-hub/supabase";
import type { Event } from "@/types/event";
import type { MemberHistory } from "@/types/member";
import type { EventRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type EventRow = {
  id: string;
  event_type_id: string;
  orbit_event_types: {
    name: string;
    color: string;
  };
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
    orbit_groups: { name_ja: string };
  }[];
  orbit_event_members: {
    member_id: string;
  }[];
};

function mapToEvent(row: EventRow): Event {
  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    eventTypeName: row.orbit_event_types.name,
    eventTypeColor: row.orbit_event_types.color,
    isMemberHistory: row.is_member_history,
    title: row.title,
    description: row.description,
    date: row.date,
    endDate: row.end_date,
    startTime: row.start_time,
    venue: row.venue,
    url: row.url,
    groupIds: (row.orbit_event_groups ?? []).map((g) => g.group_id),
    groupNames: (row.orbit_event_groups ?? []).map(
      (g) => g.orbit_groups.name_ja
    ),
    memberIds: (row.orbit_event_members ?? []).map((m) => m.member_id),
  };
}

function mapToMemberHistory(row: Pick<EventRow, "id" | "date" | "title" | "description" | "url">): MemberHistory {
  const noteParts = [row.description.trim(), row.url ?? ""].filter((v) => v.length > 0);
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
        .select(EVENT_SELECT)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")
        .order("start_time", { nullsFirst: false });

      if (error) {
        throw new RepositoryError("イベントの取得に失敗しました", error);
      }
      return (data as EventRow[]).map(mapToEvent);
    },

    async findByDate(year, month, day) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_SELECT)
        .eq("date", dateStr)
        .order("start_time", { nullsFirst: false });

      if (error) {
        throw new RepositoryError("イベントの取得に失敗しました", error);
      }
      return (data as EventRow[]).map(mapToEvent);
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
      // RPC で ID のみ取得 → 詳細データは通常の select で取得（2往復）
      // 理由: RPC に結合型を持たせるとメンテが困難。データ量は数百件程度のため問題なし
      const { data: ids, error: rpcError } = await supabase
        .rpc("find_event_ids_on_this_day", {
          target_month: month,
          target_day: day,
        });

      if (rpcError) {
        throw new RepositoryError("過去のイベントの取得に失敗しました", rpcError);
      }

      if (!ids || ids.length === 0) return [];

      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_SELECT)
        .in("id", ids)
        .order("date");

      if (error) {
        throw new RepositoryError("過去のイベントの取得に失敗しました", error);
      }

      return (data as EventRow[]).map(mapToEvent);
    },
  };
}
