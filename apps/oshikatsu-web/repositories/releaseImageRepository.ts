import type { SupabaseClient } from "@personal-hub/supabase";
import type { ReleaseImageRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";
import { RELEASE_IMAGE_BUCKET } from "@/lib/releaseImage";

export function createReleaseImageRepository(
  supabase: SupabaseClient
): ReleaseImageRepository {
  return {
    async upload({ objectPath, body, contentType, cacheControl, upsert }) {
      const { error } = await supabase.storage
        .from(RELEASE_IMAGE_BUCKET)
        .upload(objectPath, body, {
          contentType,
          cacheControl,
          upsert,
        });

      if (error) {
        throw new RepositoryError("リリース画像のアップロードに失敗しました", error);
      }
    },

    async remove(objectPaths) {
      if (objectPaths.length === 0) return;
      const { error } = await supabase.storage
        .from(RELEASE_IMAGE_BUCKET)
        .remove(objectPaths);

      if (error) {
        throw new RepositoryError("リリース画像の削除に失敗しました", error);
      }
    },
  };
}
