import type { SupabaseClient } from "@personal-hub/supabase";
import type { PersonRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type PersonRow = {
  id: string;
  display_name: string;
};

export function createPersonRepository(supabase: SupabaseClient): PersonRepository {
  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_people")
        .select("id, display_name")
        .order("display_name");

      if (error) {
        throw new RepositoryError("制作陣一覧の取得に失敗しました", error);
      }

      return ((data as PersonRow[]) ?? []).map((row) => ({
        id: row.id,
        displayName: row.display_name,
      }));
    },
  };
}
