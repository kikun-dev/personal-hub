export type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryData, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database };

/**
 * Database 型を適用済みの Supabase クライアント型。
 * Database=any の素の SupabaseClient はこの型に代入可能なため、
 * 既存の未typedな利用箇所はそのまま通る想定（packages/supabase/src/server.ts 等参照）。
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

/** public スキーマの実テーブル名 */
type PublicTableName = string & keyof Database["public"]["Tables"];

/**
 * `TypedSupabaseClient["from"]` は Tables 用 / Views 用の2つのオーバーロードを持つ
 * ジェネリックメソッドで、`Database` に Views が定義されていない現状 `Views` は空。
 * 条件型（`Foo extends (...) => infer R`）や generic instantiation expression で
 * オーバーロードから戻り値型を取り出そうとすると、TypeScript は最後のオーバーロード
 * （＝ Views 用）にしかマッチできず `never` になってしまう既知の制約がある。
 * そのため、実際に `from()` を呼び出す関数でラップし、通常の呼び出し時型推論
 * （オーバーロード解決）に委ねることでテーブルごとの正しい戻り値型を得る。
 * `typedClientForInference` は `declare const`（値を持たない）なので、この関数を
 * 実際に呼び出すとランタイムエラーになるが、`typeof` で戻り値型を取り出す目的でしか
 * 使わないため呼び出されることはない。
 */
declare const typedClientForInference: TypedSupabaseClient;
function selectableFrom<TableName extends PublicTableName>(relation: TableName) {
  return typedClientForInference.from(relation);
}

/** select チェーンのみ公開するクエリビルダー（テーブルごとに戻り値型が絞り込まれる） */
type ReadOnlyQueryBuilder<TableName extends PublicTableName> = Pick<
  ReturnType<typeof selectableFrom<TableName>>,
  "select"
>;

/**
 * 型レベルで書き込みを禁止した Supabase クライアント。
 * service role キーで RLS をバイパスする read path（ADR 0006）で、
 * 誤って insert/update/delete/upsert を呼ぶとコンパイルエラーになる。
 * `from()` は select チェーンのみを公開し、`Database` 生成型からテーブルごとの
 * 行型が推論される。rpc は Database 型上そのまま公開する
 * （読み書きの区別はアプリ側で関数名ユニオンに絞ることを推奨。
 * oshikatsu-web の OrbitReadClient 参照）。
 * schema() は書き込み可能なクライアントを返すため公開しない。
 */
export type ReadOnlySupabaseClient = Omit<TypedSupabaseClient, "from" | "schema"> & {
  from<TableName extends PublicTableName>(
    relation: TableName
  ): ReadOnlyQueryBuilder<TableName>;
};

/**
 * `from(table).select(columns)` の select 文字列リテラルから、結果行配列の型を
 * 導出するヘルパー。リポジトリ層で「行型を手書きして `as` でキャストする」代わりに使う。
 * `QueryData` は `@supabase/supabase-js` が公開する、クエリのビルダー型から
 * `data` の型を取り出すためのヘルパー型。
 *
 * @example
 * const MEMBER_SELECT = "id, name_ja" as const;
 * type MemberRow = SelectRows<"orbit_members", typeof MEMBER_SELECT>[number];
 */
function selectRowsHelper<TableName extends PublicTableName, Query extends string>(
  table: TableName,
  columns: Query
) {
  return typedClientForInference.from(table).select(columns);
}

export type SelectRows<
  TableName extends PublicTableName,
  Query extends string,
> = QueryData<ReturnType<typeof selectRowsHelper<TableName, Query>>>;

export type AuthRouteMergeMode = "merge" | "replace";

/** Auth middleware ファクトリの設定 */
export type AuthMiddlewareConfig = {
  /**
   * publicRoutes / publicExactPaths の扱い
   * - merge (default): デフォルト配列 + カスタム配列を結合（重複除去）
   * - replace: カスタム配列で置き換え
   */
  routeMergeMode?: AuthRouteMergeMode;
  /** 認証不要なルートプレフィックス (default: ["/login", "/auth"]) */
  publicRoutes?: string[];
  /** 認証不要な完全一致パス (default: ["/"]) */
  publicExactPaths?: string[];
  /** 未認証時のリダイレクト先 (default: "/login") */
  loginPath?: string;
  /**
   * 指定時、`app_metadata.role` がこの値と一致するユーザーのみ保護ルートを許可する。
   * 不一致の場合は `loginPath?error=forbidden` へリダイレクトする。
   * (default: null = ロール判定なし)
   */
  requiredRole?: string | null;
};

/** Auth callback ハンドラファクトリの設定 */
export type AuthCallbackConfig = {
  /** 認証成功後のリダイレクト先 (default: "/dashboard") */
  defaultRedirect?: string;
  /** 認証失敗時のリダイレクト先 (default: "/login") */
  errorRedirect?: string;
};
