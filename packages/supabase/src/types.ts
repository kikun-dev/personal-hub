export type { SupabaseClient } from "@supabase/supabase-js";

/** Auth middleware ファクトリの設定 */
export type AuthMiddlewareConfig = {
  /** 認証不要なルートプレフィックス (default: ["/login", "/auth"]) */
  publicRoutes?: string[];
  /** 認証不要な完全一致パス (default: ["/"]) */
  publicExactPaths?: string[];
  /** 未認証時のリダイレクト先 (default: "/login") */
  loginPath?: string;
};

/** Auth callback ハンドラファクトリの設定 */
export type AuthCallbackConfig = {
  /** 認証成功後のリダイレクト先 (default: "/dashboard") */
  defaultRedirect?: string;
  /** 認証失敗時のリダイレクト先 (default: "/login") */
  errorRedirect?: string;
};
