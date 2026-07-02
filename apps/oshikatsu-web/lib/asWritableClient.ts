import type { SupabaseClient } from "@personal-hub/supabase";
import type { OrbitReadClient } from "@/types/orbitReadClient";

/**
 * リポジトリの書き込みメソッド内でのみ使う。
 * 書き込みは server client（RLS 適用）から呼ばれる前提であり、
 * read-only client を write path に渡さない規律はこのヘルパーに集約する。
 * （リポジトリの read/write 分割は #217 で対応予定）
 *
 * 戻り値の型はあえて未typedな `SupabaseClient`（Database=any）のままにしている。
 * `TypedSupabaseClient` を返すと、まだ移行していないリポジトリ（songRepository /
 * releaseRepository / liveRepository、PR-C で対応）の insert/update/rpc ペイロードも
 * ここ経由で一括して型検査対象になり、このヘルパー1箇所の変更が無関係な複数ファイルを
 * 壊してしまう。移行済みのリポジトリ側で
 * `const writable: TypedSupabaseClient = asWritableClient(supabase);`
 * のように受け取り側で型を絞ることで、ファイル単位で段階的に型検査を有効化する
 * （未typedな SupabaseClient は TypedSupabaseClient に代入可能なため cast は不要）。
 */
export function asWritableClient(client: OrbitReadClient): SupabaseClient {
  return client as SupabaseClient;
}
