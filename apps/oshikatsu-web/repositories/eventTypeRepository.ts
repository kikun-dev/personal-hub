import type { SelectRows } from "@personal-hub/supabase";
import type { EventType } from "@/types/eventType";
import type { EventTypeRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { RepositoryError } from "@/types/errors";

const EVENT_TYPE_SELECT = "id, name, color, sort_order" as const;

type EventTypeRow = SelectRows<
  "orbit_event_types",
  typeof EVENT_TYPE_SELECT
>[number];

function mapToEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

export function createEventTypeRepository(
  supabase: OrbitReadClient
): EventTypeRepository {
  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_event_types")
        .select(EVENT_TYPE_SELECT)
        .order("sort_order");

      if (error) {
        throw new RepositoryError("イベント種別の取得に失敗しました", error);
      }
      return data.map(mapToEventType);
    },
  };
}
