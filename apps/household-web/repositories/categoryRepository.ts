import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@/types/category";
import type { CategoryRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type CategoryRow = {
  id: string;
  name: string;
  type: string;
  sort_order: number;
  is_default: boolean;
};

function mapToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type as "income" | "expense",
    sortOrder: row.sort_order,
    isDefault: row.is_default,
  };
}

export function createCategoryRepository(
  supabase: SupabaseClient
): CategoryRepository {
  return {
    async findAll(userId) {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type, sort_order, is_default")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("sort_order", { ascending: true });

      if (error) {
        throw new RepositoryError("カテゴリの取得に失敗しました", error);
      }
      return (data as CategoryRow[]).map(mapToCategory);
    },
  };
}
