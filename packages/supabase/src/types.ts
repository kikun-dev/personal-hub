export type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database };

/**
 * Database 型を適用済みの Supabase クライアント型。
 * Database=any の素の SupabaseClient はこの型に代入可能なため、
 * 既存の未typedな利用箇所はそのまま通る想定（packages/supabase/src/server.ts 等参照）。
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

/** select チェーンのみ公開するクエリビルダー */
type ReadOnlyQueryBuilder = Pick<ReturnType<SupabaseClient["from"]>, "select">;

/**
 * 型レベルで書き込みを禁止した Supabase クライアント。
 * service role キーで RLS をバイパスする read path（ADR 0006）で、
 * 誤って insert/update/delete/upsert を呼ぶとコンパイルエラーになる。
 * rpc は Database 生成型があっても読み取り専用か更新系かを型からは判別できないため、
 * 許可する関数名ユニオンを型パラメータ TAllowedRpc で明示的に渡す設計にする
 * （default: never = 何も呼べない。raw な createReadOnlyClient() の返り値で
 * 更新系 rpc を呼ぶコードもコンパイルエラーになる）。
 * 読み取り専用 rpc を使う場合はアプリ側で関数名を絞って渡す
 * （oshikatsu-web の OrbitReadClient 参照）。
 * schema() は書き込み可能なクライアントを返すため公開しない。
 */
export type ReadOnlySupabaseClient<TAllowedRpc extends string = never> = Omit<
  SupabaseClient,
  "from" | "schema" | "rpc"
> & {
  from(relation: string): ReadOnlyQueryBuilder;
  rpc(
    fn: TAllowedRpc,
    args?: Record<string, unknown>
  ): ReturnType<SupabaseClient["rpc"]>;
};

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
