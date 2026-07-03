import { type NextRequest } from "next/server";
import { createAuthProxy } from "@personal-hub/supabase/proxy";

const updateSession = createAuthProxy({
  // 家計データは個人情報のため、オーナー（admin）以外はログイン済みでも遮断する。
  // viewer は oshikatsu-web の閲覧共有用ロールであり、household は対象外（#244）。
  allowedRoles: ["admin"],
});

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除く全ルートにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     * - 画像ファイル
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
