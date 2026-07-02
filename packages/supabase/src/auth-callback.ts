import { NextResponse } from "next/server";
import { createClient } from "./server";
import type { AuthCallbackConfig } from "./types";

const DEFAULT_CONFIG: Required<AuthCallbackConfig> = {
  defaultRedirect: "/dashboard",
  errorRedirect: "/login",
};

// オープンリダイレクト防止: "/" で始まり "//" でなく、"\" を含まない相対パスのみ許可する。
// ブラウザは "\" を "/" に正規化するため、"\" を許すと "/\evil.com" が
// protocol-relative URL（"//evil.com" 相当）として扱われ、外部サイトへ遷移し得る。
function isSafeRedirectPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

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

    const next = isSafeRedirectPath(nextParam)
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
