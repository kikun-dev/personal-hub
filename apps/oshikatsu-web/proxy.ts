import { type NextRequest } from "next/server";
import { createAuthProxy } from "@personal-hub/supabase/proxy";

const updateSession = createAuthProxy({
  publicExactPaths: [],
  publicRoutes: ["/login", "/auth"],
  routeMergeMode: "replace",
  // service role read path（ADR 0006）は RLS を通らないため、
  // アプリ境界で admin/viewer ロールを要求する（ADR 0008 / #213 / #221）
  allowedRoles: ["admin", "viewer"],
  // 管理配下は admin のみ。認証済み viewer は login ではなくトップへ返す
  roleGuards: [{ paths: ["/admin"], allowedRoles: ["admin"], redirectTo: "/" }],
});

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
