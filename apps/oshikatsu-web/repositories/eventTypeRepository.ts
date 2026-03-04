import type { SupabaseClient } from "@personal-hub/supabase";
import type { EventType } from "@/types/eventType";
import type { EventTypeRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type EventTypeRow = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
};

function mapToEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

export function createEventTypeRepository(
  supabase: SupabaseClient
): EventTypeRepository {
  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_event_types")
        .select("*")
        .order("sort_order");

      if (error) {
        throw new RepositoryError("イベント種別の取得に失敗しました", error);
      }
      return (data as EventTypeRow[]).map(mapToEventType);
    },
  };
}
