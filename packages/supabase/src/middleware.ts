import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthMiddlewareConfig } from "./types";

const DEFAULT_CONFIG: Required<AuthMiddlewareConfig> = {
  publicRoutes: ["/login", "/auth"],
  publicExactPaths: ["/"],
  loginPath: "/login",
};

export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const mergedConfig: Required<AuthMiddlewareConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 未認証で保護ルートにアクセスした場合、ログインページへリダイレクト
    const { pathname } = request.nextUrl;
    const isPublicRoute =
      mergedConfig.publicRoutes.some((route) => pathname.startsWith(route)) ||
      mergedConfig.publicExactPaths.some((path) => pathname === path);

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      const redirectTo = pathname + request.nextUrl.search;
      url.pathname = mergedConfig.loginPath;
      url.searchParams.set("next", redirectTo);
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  };
}
