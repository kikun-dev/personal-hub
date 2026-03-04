import { NextResponse } from "next/server";
import { createClient } from "./server";
import type { AuthCallbackConfig } from "./types";

const DEFAULT_CONFIG: Required<AuthCallbackConfig> = {
  defaultRedirect: "/dashboard",
  errorRedirect: "/login",
};

export function createAuthCallbackHandler(config: AuthCallbackConfig = {}) {
  const mergedConfig: Required<AuthCallbackConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const nextParam =
      searchParams.get("next") ?? mergedConfig.defaultRedirect;

    // オープンリダイレクト防止: "/" で始まり "//" でない相対パスのみ許可
    const next =
      nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : mergedConfig.defaultRedirect;

    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    // 認証エラー時はログインページへ戻す
    return NextResponse.redirect(
      `${origin}${mergedConfig.errorRedirect}?error=auth_failed`
    );
  };
}
