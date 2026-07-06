import type { SupabaseClient } from "@personal-hub/supabase";
import type { SpotPhotoRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";
import { SPOT_PHOTO_BUCKET } from "@/lib/spotPhoto";

export function createSpotPhotoRepository(
  supabase: SupabaseClient
): SpotPhotoRepository {
  return {
    async upload({ objectPath, body, contentType, cacheControl, upsert }) {
      const { error } = await supabase.storage
        .from(SPOT_PHOTO_BUCKET)
        .upload(objectPath, body, {
          contentType,
          cacheControl,
          upsert,
        });

      if (error) {
        throw new RepositoryError("スポット写真のアップロードに失敗しました", error);
      }
    },

    async remove(objectPaths) {
      if (objectPaths.length === 0) return;
      const { error } = await supabase.storage
        .from(SPOT_PHOTO_BUCKET)
        .remove(objectPaths);

      if (error) {
        throw new RepositoryError("スポット写真の削除に失敗しました", error);
      }
    },
  };
}
