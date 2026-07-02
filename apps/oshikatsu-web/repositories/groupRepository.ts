import type { SelectRows } from "@personal-hub/supabase";
import type { Group } from "@/types/group";
import type { GroupRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { RepositoryError } from "@/types/errors";

const GROUP_SELECT = `
  id, name_ja, name_en, color, max_generation, is_active, successor_id, sort_order,
  orbit_group_penlight_colors(id, name, hex, sort_order)
` as const;

type GroupRow = SelectRows<"orbit_groups", typeof GROUP_SELECT>[number];

function mapToGroup(row: GroupRow): Group {
  return {
    id: row.id,
    nameJa: row.name_ja,
    nameEn: row.name_en,
    color: row.color,
    maxGeneration: row.max_generation,
    isActive: row.is_active,
    successorId: row.successor_id,
    sortOrder: row.sort_order,
    penlightColors: (row.orbit_group_penlight_colors ?? [])
      .map((color) => ({
        id: color.id,
        name: color.name,
        hex: color.hex,
        sortOrder: color.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function createGroupRepository(
  supabase: OrbitReadClient
): GroupRepository {
  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_groups")
        .select(GROUP_SELECT)
        .order("sort_order");

      if (error) {
        throw new RepositoryError("グループの取得に失敗しました", error);
      }
      return data.map(mapToGroup);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_groups")
        .select(GROUP_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("グループの取得に失敗しました", error);
      }
      return mapToGroup(data);
    },
  };
}
