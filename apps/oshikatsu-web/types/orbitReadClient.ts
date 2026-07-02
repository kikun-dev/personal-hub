import type {
  Database,
  ReadOnlySupabaseClient,
  TypedSupabaseClient,
} from "@personal-hub/supabase";

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
  | "find_orbit_birthdays_by_month"
  | "find_orbit_birthdays_by_date"
>;

/**
 * `TypedSupabaseClient["rpc"]` は Args にデフォルト値を持つ単一シグネチャの
 * ジェネリックメソッドだが、`fn` を `OrbitReadRpcFunction` に絞り込んだ上で
 * `Args` / `Returns` を関数ごとに推論させるため、`from()` と同様に実際に呼び出す
 * 関数でラップし通常の呼び出し時型推論に委ねる。
 * `typedClientForInference` は値を持たない `declare const` なので、この関数が
 * 実際に呼び出されることはない（`typeof` で戻り値型を取り出す目的のみで使用）。
 */
declare const typedClientForInference: TypedSupabaseClient;
function readOnlyRpc<FnName extends OrbitReadRpcFunction>(
  fn: FnName,
  args: Database["public"]["Functions"][FnName]["Args"]
) {
  return typedClientForInference.rpc(fn, args);
}
// 型抽出専用の関数であることを明示しつつ、値としても参照しておく
// （`no-unused-vars` は `typeof` 経由の型参照のみだと「未使用」と判定するため）。
void readOnlyRpc;

/**
 * Orbit の read path 用クライアント型。
 * 書き込みメソッドと更新系 RPC の呼び出しをコンパイルエラーにする。
 */
export type OrbitReadClient = Omit<ReadOnlySupabaseClient, "rpc"> & {
  rpc<FnName extends OrbitReadRpcFunction>(
    fn: FnName,
    args: Database["public"]["Functions"][FnName]["Args"]
  ): ReturnType<typeof readOnlyRpc<FnName>>;
};
