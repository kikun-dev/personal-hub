export type { SupabaseClient } from "@supabase/supabase-js";

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
   * 指定時、`app_metadata.role` がこの配列に含まれるユーザーのみ保護ルートを許可する。
   * 含まれない場合は `loginPath?error=forbidden` へリダイレクトする。
   * (default: null = ロール判定なし)
   */
  allowedRoles?: string[] | null;
  /**
   * パス単位で追加のロール制限をかけるガードのリスト。
   * allowedRoles を通過したユーザーに対してさらに適用される。
   * (default: [])
   */
  roleGuards?: RoleGuard[];
};

/** パスプレフィックス単位のロールガード */
export type RoleGuard = {
  /** ガード対象のパス（完全一致 or セグメント境界の前方一致） */
  paths: string[];
  /** このパスへのアクセスを許可するロール */
  allowedRoles: string[];
  /** 不許可時のリダイレクト先 (default: loginPath) */
  redirectTo?: string;
};

/** Auth callback ハンドラファクトリの設定 */
export type AuthCallbackConfig = {
  /** 認証成功後のリダイレクト先 (default: "/dashboard") */
  defaultRedirect?: string;
  /** 認証失敗時のリダイレクト先 (default: "/login") */
  errorRedirect?: string;
};
