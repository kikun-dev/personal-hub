import type { Database, ReadOnlySupabaseClient } from "@personal-hub/supabase";

/**
 * read path で使用を許可する読み取り専用 RPC 関数名。
 * `Extract` で `Database["public"]["Functions"]` に実在する名前だけに絞り込む。
 * 関数名が typo している、または DB 側で削除された場合はこのユニオンから静かに
 * 消えるため、`client.rpc(...)` 呼び出し側（typetest 含む）でその関数名が
 * 型エラーになる形で気づける。
 */
export type OrbitReadRpcFunction = Extract<
  keyof Database["public"]["Functions"],
  | "find_orbit_events_on_this_day"
  | "find_orbit_live_performances_on_this_day"
  | "find_orbit_releases_on_this_day"
  | "find_orbit_calendar_videos_in_ranges"
  | "find_orbit_calendar_videos_on_this_day"
  | "find_orbit_birthdays_by_month"
  | "find_orbit_birthdays_by_date"
>;

/**
 * Orbit の read path 用クライアント型。
 * 書き込みメソッドと更新系 RPC の呼び出しをコンパイルエラーにする。
 * rpc は ReadOnlySupabaseClient の型パラメータで許可関数名だけに絞り、
 * 関数ごとの Args / Returns はパッケージ側の推論ラッパーで型付けされる。
 */
export type OrbitReadClient = ReadOnlySupabaseClient<OrbitReadRpcFunction>;
