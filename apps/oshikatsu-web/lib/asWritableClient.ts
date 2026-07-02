import type { SupabaseClient } from "@personal-hub/supabase";
import type { OrbitReadClient } from "@/types/orbitReadClient";

/**
 * リポジトリの書き込みメソッド内でのみ使う。
 * 書き込みは server client（RLS 適用）から呼ばれる前提であり、
 * read-only client を write path に渡さない規律はこのヘルパーに集約する。
 * （リポジトリの read/write 分割は #217 で対応予定）
 */
export function asWritableClient(client: OrbitReadClient): SupabaseClient {
  return client as SupabaseClient;
}
