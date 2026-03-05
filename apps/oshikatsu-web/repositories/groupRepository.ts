import type { SupabaseClient } from "@personal-hub/supabase";
import type { Group } from "@/types/group";
import type { GroupRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type GroupPenlightColorRow = {
  id: string;
  name: string;
  hex: string;
  sort_order: number;
};

type GroupRow = {
  id: string;
  name_ja: string;
  name_en: string | null;
  color: string;
  max_generation: number | null;
  is_active: boolean;
  successor_id: string | null;
  sort_order: number;
  orbit_group_penlight_colors?: GroupPenlightColorRow[];
};

const GROUP_SELECT = `
  id, name_ja, name_en, color, max_generation, is_active, successor_id, sort_order,
  orbit_group_penlight_colors(id, name, hex, sort_order)
`;

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
  supabase: SupabaseClient
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
      return (data as GroupRow[]).map(mapToGroup);
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
      return mapToGroup(data as GroupRow);
    },
  };
}
