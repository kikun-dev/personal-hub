import type { ReadOnlySupabaseClient } from "@personal-hub/supabase";
import type { OrbitReadClient } from "./orbitReadClient";

/**
 * OrbitReadClient / ReadOnlySupabaseClient の型レベルテスト。
 * ここでの検証はコンパイル時のみが目的で、ランタイムでは呼び出さない
 * （どこからも import せず、`pnpm typecheck` の対象になることだけを利用する）。
 *
 * `@ts-expect-error` の行が「実際にはエラーにならない」場合は型ガードが機能していない
 * ということなので、型定義側（types.ts / orbitReadClient.ts）を修正すること。
 * このテストを消して誤魔化さない。
 */
export function orbitReadClientTypeTest(
  client: OrbitReadClient,
  readOnlyClient: ReadOnlySupabaseClient
): void {
  // --- 正常系: select チェーンは許可される ---
  void client.from("orbit_groups").select("id, name_ja");
  void client
    .from("orbit_members")
    .select("id, name_ja")
    .eq("id", "member-id")
    .single();

  // --- 正常系: select した列だけが行の型に現れる（生成型からの推論が効いている） ---
  async function checkSelectInference() {
    const { data } = await client.from("orbit_groups").select("id, name_ja");
    const row = data?.[0];
    if (row) {
      const id: string = row.id;
      const nameJa: string = row.name_ja;
      void id;
      void nameJa;
      // @ts-expect-error select していない列は行の型に存在しない
      void row.color;
    }
  }
  void checkSelectInference;

  // --- 正常系: 許可された読み取り専用 rpc は呼べる ---
  void client.rpc("find_orbit_events_on_this_day", {
    target_month: 1,
    target_day: 1,
  });
  void client.rpc("find_orbit_birthdays_by_month", { target_month: 1 });
  void client.rpc("find_orbit_birthdays_by_date", {
    target_month: 1,
    target_day: 1,
  });
  void client.rpc("find_orbit_live_performances_on_this_day", {
    target_month: 1,
    target_day: 1,
  });
  void client.rpc("find_orbit_releases_on_this_day", {
    target_month: 1,
    target_day: 1,
  });
  void client.rpc("find_orbit_calendar_videos_on_this_day", {
    target_month: 1,
    target_day: 1,
  });
  void client.rpc("find_orbit_calendar_videos_in_ranges", {
    range_1_start: "2026-01-01",
    range_1_end: "2026-02-01",
    range_2_start: null,
    range_2_end: null,
  });

  // --- 異常系: 書き込みメソッドは from() の戻り値（select のみ）に存在せずコンパイルエラーになる ---
  // @ts-expect-error insert は ReadOnlyQueryBuilder に存在しない
  client.from("orbit_groups").insert({ name_ja: "test" });

  // @ts-expect-error update は ReadOnlyQueryBuilder に存在しない
  client.from("orbit_groups").update({ name_ja: "test" });

  // @ts-expect-error delete は ReadOnlyQueryBuilder に存在しない
  client.from("orbit_groups").delete();

  // @ts-expect-error upsert は ReadOnlyQueryBuilder に存在しない
  client.from("orbit_groups").upsert({ name_ja: "test" });

  // --- 異常系: 更新系 rpc は OrbitReadRpcFunction のユニオンに含まれずコンパイルエラーになる ---
  // @ts-expect-error upsert_orbit_event は書き込み用 rpc のため呼べない
  client.rpc("upsert_orbit_event", {});

  // --- 異常系: raw な ReadOnlySupabaseClient（TAllowedRpc 未指定 = never）では
  // 読み取り用を含む一切の rpc が呼べない（更新系 rpc の誤用防止。#215 の完了条件） ---
  // @ts-expect-error ReadOnlySupabaseClient は default で rpc を一切許可しない
  readOnlyClient.rpc("upsert_orbit_event", {});
  // @ts-expect-error 読み取り用 rpc も許可ユニオンを渡さない限り呼べない
  readOnlyClient.rpc("find_orbit_events_on_this_day", {});

  // --- 異常系: schema() は書き込み可能なクライアントを返すため ReadOnlySupabaseClient に存在しない ---
  // @ts-expect-error schema は ReadOnlySupabaseClient で公開しない
  readOnlyClient.schema("public");
}
