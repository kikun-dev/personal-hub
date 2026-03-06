import type { SupabaseClient } from "@personal-hub/supabase";
import type { MemberImageRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";
import { MEMBER_IMAGE_BUCKET } from "@/lib/memberImage";

export function createMemberImageRepository(
  supabase: SupabaseClient
): MemberImageRepository {
  return {
    async upload({ objectPath, body, contentType, cacheControl, upsert }) {
      const { error } = await supabase.storage
        .from(MEMBER_IMAGE_BUCKET)
        .upload(objectPath, body, {
          contentType,
          cacheControl,
          upsert,
        });

      if (error) {
        throw new RepositoryError("メンバー画像のアップロードに失敗しました", error);
      }
    },

    async remove(objectPaths) {
      if (objectPaths.length === 0) return;
      const { error } = await supabase.storage
        .from(MEMBER_IMAGE_BUCKET)
        .remove(objectPaths);

      if (error) {
        throw new RepositoryError("メンバー画像の削除に失敗しました", error);
      }
    },
  };
}
