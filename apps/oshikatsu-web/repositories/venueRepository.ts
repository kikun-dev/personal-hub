import type { SupabaseClient } from "@personal-hub/supabase";
import type { VenueRepository } from "@/types/repositories";
import type { Venue, VenueOption } from "@/types/venue";
import { RepositoryError } from "@/types/errors";

type VenueRow = {
  id: string;
  name: string;
  prefecture: string | null;
  capacity: number | null;
  map_url: string | null;
  official_url: string | null;
  access: string | null;
  notes: string | null;
};

type VenueOptionRow = {
  id: string;
  name: string;
};

function parseCapacity(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function createVenueRepository(supabase: SupabaseClient): VenueRepository {
  const selectFields =
    "id, name, prefecture, capacity, map_url, official_url, access, notes";

  const mapVenue = (row: VenueRow): Venue => ({
    id: row.id,
    name: row.name,
    prefecture: row.prefecture,
    capacity: row.capacity,
    mapUrl: row.map_url,
    officialUrl: row.official_url,
    access: row.access,
    notes: row.notes,
  });

  const mapVenueOption = (row: VenueOptionRow): VenueOption => ({
    id: row.id,
    name: row.name,
  });

  const toRow = (input: {
    name: string;
    prefecture: string;
    capacity: string;
    mapUrl: string;
    officialUrl: string;
    access: string;
    notes: string;
  }) => ({
    name: input.name.trim(),
    prefecture: input.prefecture.trim() || null,
    capacity: parseCapacity(input.capacity),
    map_url: input.mapUrl.trim() || null,
    official_url: input.officialUrl.trim() || null,
    access: input.access.trim() || null,
    notes: input.notes.trim() || null,
  });

  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_venues")
        .select(selectFields)
        .order("name");

      if (error) {
        throw new RepositoryError("会場一覧の取得に失敗しました", error);
      }

      return ((data as VenueRow[]) ?? []).map(mapVenue);
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_venues")
        .select("id, name")
        .order("name");

      if (error) {
        throw new RepositoryError("会場候補の取得に失敗しました", error);
      }

      return ((data as VenueOptionRow[] | null) ?? []).map(mapVenueOption);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_venues")
        .select(selectFields)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("会場の取得に失敗しました", error);
      }

      return mapVenue(data as VenueRow);
    },

    async create(input) {
      const { data, error } = await supabase
        .from("orbit_venues")
        .insert(toRow(input))
        .select(selectFields)
        .single();

      if (error) {
        throw new RepositoryError("会場の作成に失敗しました", error);
      }

      return mapVenue(data as VenueRow);
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError("更新対象の会場が見つかりません", null);
      }

      const { data, error } = await supabase
        .from("orbit_venues")
        .update(toRow(input))
        .eq("id", id)
        .select(selectFields)
        .single();

      if (error) {
        throw new RepositoryError("会場の更新に失敗しました", error);
      }

      return mapVenue(data as VenueRow);
    },

    async delete(id) {
      const { error } = await supabase
        .from("orbit_venues")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("会場の削除に失敗しました", error);
      }
    },
  };
}
