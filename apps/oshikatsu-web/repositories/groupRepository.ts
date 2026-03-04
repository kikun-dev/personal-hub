import type { SupabaseClient } from "@personal-hub/supabase";
import type { Group } from "@/types/group";
import type { GroupRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type GroupRow = {
  id: string;
  name_ja: string;
  name_en: string | null;
  color: string;
  is_active: boolean;
  successor_id: string | null;
  sort_order: number;
};

function mapToGroup(row: GroupRow): Group {
  return {
    id: row.id,
    nameJa: row.name_ja,
    nameEn: row.name_en,
    color: row.color,
    isActive: row.is_active,
    successorId: row.successor_id,
    sortOrder: row.sort_order,
  };
}

export function createGroupRepository(
  supabase: SupabaseClient
): GroupRepository {
  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_groups")
        .select("*")
        .order("sort_order");

      if (error) {
        throw new RepositoryError("グループの取得に失敗しました", error);
      }
      return (data as GroupRow[]).map(mapToGroup);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_groups")
        .select("*")
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
