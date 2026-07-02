import type { ReadOnlySupabaseClient, SupabaseClient } from "@personal-hub/supabase";

/** read path で使用を許可する読み取り専用 RPC 関数名 */
export type OrbitReadRpcFunction =
  | "find_orbit_events_on_this_day"
  | "find_orbit_birthdays_by_month"
  | "find_orbit_birthdays_by_date";

/**
 * Orbit の read path 用クライアント型。
 * 書き込みメソッドと更新系 RPC の呼び出しをコンパイルエラーにする。
 */
export type OrbitReadClient = Omit<ReadOnlySupabaseClient, "rpc"> & {
  rpc(
    fn: OrbitReadRpcFunction,
    args?: Record<string, unknown>
  ): ReturnType<SupabaseClient["rpc"]>;
};
