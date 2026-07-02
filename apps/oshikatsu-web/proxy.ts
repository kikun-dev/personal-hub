import { type NextRequest } from "next/server";
import { createAuthProxy } from "@personal-hub/supabase/proxy";

const updateSession = createAuthProxy({
  publicExactPaths: [],
  publicRoutes: ["/login", "/auth"],
  routeMergeMode: "replace",
  // service role read path（ADR 0006）は RLS を通らないため、
  // アプリ境界でも admin ロールを要求する（ADR 0008 / #213）
  requiredRole: "admin",
});

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
