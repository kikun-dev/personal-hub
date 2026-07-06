import type { SupabaseClient } from "@personal-hub/supabase";
import { RepositoryError } from "@/types/errors";

/**
 * member / release / spot の画像アップロード用リポジトリの共通形。
 * `MemberImageRepository` / `ReleaseImageRepository` / `SpotPhotoRepository`
 * はいずれもこれと構造的に同一（Issue #298）。
 */
export type StorageImageRepository = {
  upload(input: {
    objectPath: string;
    body: Uint8Array;
    contentType: string;
    cacheControl: string;
    upsert: boolean;
  }): Promise<void>;
  remove(objectPaths: string[]): Promise<void>;
};

export type StorageImageRepositoryConfig = {
  bucket: string;
  // エラーメッセージに使う日本語ラベル（例:「メンバー画像」「リリース画像」「スポット写真」）
  domainLabel: string;
};

export function createStorageImageRepository(
  supabase: SupabaseClient,
  config: StorageImageRepositoryConfig
): StorageImageRepository {
  return {
    async upload({ objectPath, body, contentType, cacheControl, upsert }) {
      const { error } = await supabase.storage
        .from(config.bucket)
        .upload(objectPath, body, {
          contentType,
          cacheControl,
          upsert,
        });

      if (error) {
        throw new RepositoryError(`${config.domainLabel}のアップロードに失敗しました`, error);
      }
    },

    async remove(objectPaths) {
      if (objectPaths.length === 0) return;
      const { error } = await supabase.storage
        .from(config.bucket)
        .remove(objectPaths);

      if (error) {
        throw new RepositoryError(`${config.domainLabel}の削除に失敗しました`, error);
      }
    },
  };
}
