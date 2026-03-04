import type { SupabaseClient } from "@personal-hub/supabase";
import type { Event } from "@/types/event";
import type { EventRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type EventRow = {
  id: string;
  event_type_id: string;
  orbit_event_types: {
    name: string;
    color: string;
  };
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

    async create(input) {
      const { data: event, error: eventError } = await supabase
        .from("orbit_events")
        .insert({
          event_type_id: input.eventTypeId,
          title: input.title,
          description: input.description || "",
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
      const { error: eventError } = await supabase
        .from("orbit_events")
        .update({
          event_type_id: input.eventTypeId,
          title: input.title,
          description: input.description || "",
          date: input.date,
          end_date: input.endDate || null,
          start_time: input.startTime || null,
          venue: input.venue || null,
          url: input.url || null,
        })
        .eq("id", id);

      if (eventError) {
        throw new RepositoryError("イベントの更新に失敗しました", eventError);
      }

      // グループ: 全削除→再挿入
      const { error: deleteGroupError } = await supabase
        .from("orbit_event_groups")
        .delete()
        .eq("event_id", id);
      if (deleteGroupError) {
        throw new RepositoryError("イベントのグループ更新に失敗しました", deleteGroupError);
      }

      if (input.groupIds.length > 0) {
        const { error: groupError } = await supabase
          .from("orbit_event_groups")
          .insert(
            input.groupIds.map((groupId) => ({
              event_id: id,
              group_id: groupId,
            }))
          );
        if (groupError) {
          throw new RepositoryError("イベントのグループ登録に失敗しました", groupError);
        }
      }

      // メンバー: 全削除→再挿入
      const { error: deleteMemberError } = await supabase
        .from("orbit_event_members")
        .delete()
        .eq("event_id", id);
      if (deleteMemberError) {
        throw new RepositoryError("イベントのメンバー更新に失敗しました", deleteMemberError);
      }

      if (input.memberIds.length > 0) {
        const { error: memberError } = await supabase
          .from("orbit_event_members")
          .insert(
            input.memberIds.map((memberId) => ({
              event_id: id,
              member_id: memberId,
            }))
          );
        if (memberError) {
          throw new RepositoryError("イベントのメンバー登録に失敗しました", memberError);
        }
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
      // date 型に like は使えないため、全イベント取得後にアプリ側でフィルタ
      // データ量が増えた場合は RPC 関数に移行する
      const { data, error } = await supabase
        .from("orbit_events")
        .select(EVENT_SELECT)
        .order("date");

      if (error) {
        throw new RepositoryError("過去のイベントの取得に失敗しました", error);
      }

      return (data as EventRow[])
        .filter((row) => {
          const d = new Date(row.date + "T00:00:00");
          return d.getMonth() + 1 === month && d.getDate() === day;
        })
        .map(mapToEvent);
    },
  };
}
