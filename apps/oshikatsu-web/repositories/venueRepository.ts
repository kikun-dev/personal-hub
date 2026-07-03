import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { VenueRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import type { Venue, VenueOption } from "@/types/venue";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";

const VENUE_SELECT =
  "id, name, prefecture, capacity, map_url, official_url, access, notes" as const;
const VENUE_OPTION_SELECT = "id, name" as const;

type VenueRow = SelectRows<"orbit_venues", typeof VENUE_SELECT>[number];
type VenueOptionRow = SelectRows<
  "orbit_venues",
  typeof VENUE_OPTION_SELECT
>[number];

function parseCapacity(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function createVenueRepository(supabase: OrbitReadClient): VenueRepository {
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
        .select(VENUE_SELECT)
        .order("name");

      if (error) {
        throw new RepositoryError("会場一覧の取得に失敗しました", error);
      }

      return data.map(mapVenue);
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_venues")
        .select(VENUE_OPTION_SELECT)
        .order("name");

      if (error) {
        throw new RepositoryError("会場候補の取得に失敗しました", error);
      }

      return data.map(mapVenueOption);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_venues")
        .select(VENUE_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("会場の取得に失敗しました", error);
      }

      return mapVenue(data);
    },

    async create(input) {
      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { data, error } = await writable
        .from("orbit_venues")
        .insert(toRow(input))
        .select(VENUE_SELECT)
        .single();

      if (error) {
        throw new RepositoryError("会場の作成に失敗しました", error);
      }

      return mapVenue(data);
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError("更新対象の会場が見つかりません", null);
      }

      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { data, error } = await writable
        .from("orbit_venues")
        .update(toRow(input))
        .eq("id", id)
        .select(VENUE_SELECT)
        .single();

      if (error) {
        throw new RepositoryError("会場の更新に失敗しました", error);
      }

      return mapVenue(data);
    },

    async delete(id) {
      const writable = asWritableClient(supabase);
      const { error } = await writable
        .from("orbit_venues")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("会場の削除に失敗しました", error);
      }
    },
  };
}
