import type { SupabaseClient } from "@personal-hub/supabase";
import type { SpotPhotoRepository } from "@/types/repositories";
import { createStorageImageRepository } from "@/repositories/storageImageRepository";
import { SPOT_PHOTO_BUCKET } from "@/lib/spotPhoto";

export function createSpotPhotoRepository(
  supabase: SupabaseClient
): SpotPhotoRepository {
  return createStorageImageRepository(supabase, {
    bucket: SPOT_PHOTO_BUCKET,
    domainLabel: "スポット写真",
  });
}
