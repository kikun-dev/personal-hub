import type { SupabaseClient } from "@personal-hub/supabase";
import type { ReleaseImageRepository } from "@/types/repositories";
import { createStorageImageRepository } from "@/repositories/storageImageRepository";
import { RELEASE_IMAGE_BUCKET } from "@/lib/releaseImage";

export function createReleaseImageRepository(
  supabase: SupabaseClient
): ReleaseImageRepository {
  return createStorageImageRepository(supabase, {
    bucket: RELEASE_IMAGE_BUCKET,
    domainLabel: "リリース画像",
  });
}
