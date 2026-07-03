import type { SupabaseClient } from "@personal-hub/supabase";
import type { OrbitReadClient } from "@/types/orbitReadClient";

/**
 * リポジトリの書き込みメソッド内でのみ使う。
 * 書き込みは server client（RLS 適用）から呼ばれる前提であり、
 * read-only client を write path に渡さない規律はこのヘルパーに集約する。
 * （リポジトリの read/write 分割は #217 で対応予定）
 *
 * 戻り値の型はあえて未typedな `SupabaseClient`（Database=any）のままにしている。
 * song/release/live を含む全リポジトリの select/insert/update は typed 化済み（PR-A/B/C）
 * だが、`update_member_with_relations` / `update_event_with_relations` /
 * `create_track_with_relations_v2` / `update_track_with_relations_v2` /
 * `create_release_with_relations` / `update_release_with_relations` /
 * `upsert_orbit_live`（新規作成時の `p_id: null`）といった一部の RPC 呼び出しは、
 * PostgREST の RPC スカラー引数の型生成が NULL 許容を反映しない既知の制約により、
 * 生成 Args と実ペイロード（null を送る想定のフィールドを含む）が構造的に一致しない。
 * これらの呼び出しは今後も未typedな戻り値のまま呼ぶ必要があるため、
 * `asWritableClient` 自体の戻り値を `TypedSupabaseClient` に変更することはできない
 * （変更すると、これらの呼び出しが未注釈のまま typed 化されてコンパイルエラーになる）。
 * 実ペイロードが生成 Args と一致する呼び出し（`set_track_centers` /
 * `set_release_member_positions` / update 時の `upsert_orbit_live` 等）は、
 * 移行済みのリポジトリ側で
 * `const writable: TypedSupabaseClient = asWritableClient(supabase);`
 * のように受け取り側で型を絞ることで、呼び出し単位で型検査を有効化する
 * （未typedな SupabaseClient は TypedSupabaseClient に代入可能なため cast は不要）。
 */
export function asWritableClient(client: OrbitReadClient): SupabaseClient {
  return client as SupabaseClient;
}
