import { type NextRequest } from "next/server";
import { createAuthProxy } from "@personal-hub/supabase/proxy";

const updateSession = createAuthProxy({
  publicExactPaths: [],
  publicRoutes: ["/login", "/auth"],
  routeMergeMode: "replace",
});

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
