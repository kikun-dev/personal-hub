import type { SupabaseClient } from "@personal-hub/supabase";
import type { PersonRepository } from "@/types/repositories";
import type {
  Person,
  PersonOption,
  PersonRole,
  EnsurePersonRoleEntry,
} from "@/types/person";
import { RepositoryError } from "@/types/errors";

type PersonRow = {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  roles: string[] | null;
  biography: string | null;
};

type PersonOptionRow = {
  id: string;
  display_name: string;
  roles: string[] | null;
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

  const mapPersonOption = (row: PersonOptionRow): PersonOption => ({
    id: row.id,
    displayName: row.display_name,
    roles: (row.roles ?? []) as PersonRole[],
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

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_people")
        .select("id, display_name, roles")
        .order("display_name");

      if (error) {
        throw new RepositoryError("制作陣候補の取得に失敗しました", error);
      }

      return ((data as PersonOptionRow[] | null) ?? []).map(mapPersonOption);
    },

    async ensurePeopleRoles(entries: EnsurePersonRoleEntry[]) {
      // display_name ごとに付与する role を集約する
      const rolesByName = new Map<string, Set<PersonRole>>();
      for (const entry of entries) {
        const name = entry.displayName.trim();
        if (!name) continue;
        const set = rolesByName.get(name) ?? new Set<PersonRole>();
        set.add(entry.role);
        rolesByName.set(name, set);
      }
      const names = Array.from(rolesByName.keys());
      if (names.length === 0) return;

      const { data, error } = await supabase
        .from("orbit_people")
        .select("id, display_name, roles")
        .in("display_name", names);
      if (error) {
        throw new RepositoryError("制作陣の担当情報の取得に失敗しました", error);
      }
      const existing = new Map(
        (
          (data as Array<{
            id: string;
            display_name: string;
            roles: string[] | null;
          }>) ?? []
        ).map((row) => [row.display_name, row] as const)
      );

      const toInsert: Array<{ display_name: string; roles: PersonRole[] }> = [];
      for (const [name, roleSet] of rolesByName) {
        const person = existing.get(name);
        if (!person) {
          toInsert.push({ display_name: name, roles: Array.from(roleSet) });
          continue;
        }
        // 名前一致は既存人物に不足 role を追加する（重複は付けない）
        const merged = new Set<PersonRole>((person.roles ?? []) as PersonRole[]);
        const before = merged.size;
        for (const role of roleSet) merged.add(role);
        if (merged.size === before) continue;

        const { error: updateError } = await supabase
          .from("orbit_people")
          .update({ roles: Array.from(merged) })
          .eq("id", person.id);
        if (updateError) {
          throw new RepositoryError("制作陣の担当追加に失敗しました", updateError);
        }
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("orbit_people")
          .insert(toInsert);
        if (insertError) {
          throw new RepositoryError("制作陣の登録に失敗しました", insertError);
        }
      }
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
