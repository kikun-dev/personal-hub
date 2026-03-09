import type { SupabaseClient } from "@personal-hub/supabase";
import type { PersonRepository } from "@/types/repositories";
import type { Person, PersonRole } from "@/types/person";
import { RepositoryError } from "@/types/errors";

type PersonRow = {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  roles: string[] | null;
  biography: string | null;
};

export function createPersonRepository(supabase: SupabaseClient): PersonRepository {
  const selectFields = "id, display_name, date_of_birth, roles, biography";

  const mapPerson = (row: PersonRow): Person => ({
    id: row.id,
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
    roles: ((row.roles ?? []) as PersonRole[]),
    biography: row.biography,
  });

  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_people")
        .select(selectFields)
        .order("display_name");

      if (error) {
        throw new RepositoryError("制作陣一覧の取得に失敗しました", error);
      }

      return ((data as PersonRow[]) ?? []).map(mapPerson);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_people")
        .select(selectFields)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("制作陣の取得に失敗しました", error);
      }

      return mapPerson(data as PersonRow);
    },

    async create(input) {
      const { data, error } = await supabase
        .from("orbit_people")
        .insert({
          display_name: input.displayName.trim(),
          date_of_birth: input.dateOfBirth || null,
          roles: input.roles,
          biography: input.biography.trim() || null,
        })
        .select(selectFields)
        .single();

      if (error) {
        throw new RepositoryError("制作陣の作成に失敗しました", error);
      }

      return mapPerson(data as PersonRow);
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError("更新対象の制作陣が見つかりません", null);
      }

      const { data, error } = await supabase
        .from("orbit_people")
        .update({
          display_name: input.displayName.trim(),
          date_of_birth: input.dateOfBirth || null,
          roles: input.roles,
          biography: input.biography.trim() || null,
        })
        .eq("id", id)
        .select(selectFields)
        .single();

      if (error) {
        throw new RepositoryError("制作陣の更新に失敗しました", error);
      }

      return mapPerson(data as PersonRow);
    },

    async delete(id) {
      const { error } = await supabase
        .from("orbit_people")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("制作陣の削除に失敗しました", error);
      }
    },
  };
}
