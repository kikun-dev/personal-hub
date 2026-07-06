import type { SupabaseClient } from "@personal-hub/supabase";
import type { MemberImageRepository } from "@/types/repositories";
import { createStorageImageRepository } from "@/repositories/storageImageRepository";
import { MEMBER_IMAGE_BUCKET } from "@/lib/memberImage";

export function createMemberImageRepository(
  supabase: SupabaseClient
): MemberImageRepository {
  return createStorageImageRepository(supabase, {
    bucket: MEMBER_IMAGE_BUCKET,
    domainLabel: "メンバー画像",
  });
}
