import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthMiddlewareConfig } from "./types";

const DEFAULT_CONFIG: Required<AuthMiddlewareConfig> = {
  routeMergeMode: "merge",
  publicRoutes: ["/login", "/auth"],
  publicExactPaths: ["/"],
  loginPath: "/login",
};

function mergePaths(
  defaults: string[],
  customPaths: string[] | undefined,
  mode: Required<AuthMiddlewareConfig>["routeMergeMode"]
): string[] {
  if (!customPaths) return defaults;
  if (mode === "replace") return customPaths;
  return Array.from(new Set([...defaults, ...customPaths]));
}

export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const routeMergeMode = config.routeMergeMode ?? DEFAULT_CONFIG.routeMergeMode;
  const mergedConfig: Required<AuthMiddlewareConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
    routeMergeMode,
    publicRoutes: mergePaths(
      DEFAULT_CONFIG.publicRoutes,
      config.publicRoutes,
      routeMergeMode
    ),
    publicExactPaths: mergePaths(
      DEFAULT_CONFIG.publicExactPaths,
      config.publicExactPaths,
      routeMergeMode
    ),
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
