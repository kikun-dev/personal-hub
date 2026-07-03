import { createClient } from "@personal-hub/supabase/server";

const ADMIN_ROLE = "admin";

/**
 * Server Component から追加のネットワーク往復なしでロールを取得するヘルパー。
 *
 * `supabase.auth.getSession()` は cookie に載っている JWT をサーバー側で
 * 検証なしで読むだけであり（ADR 0006: layout で `getUser`（ネットワーク往復）を
 * 行わない方針を維持するための選択）、これは **認可判定に使ってはならない**。
 *
 * ここでの用途は UI の表示出し分け（管理メニューや編集/削除導線の非表示）のみ。
 * 実際の防御は
 * - middleware（`proxy.ts` の `allowedRoles` / `roleGuards`, PR-3）
 * - 書き込み・管理系入口の `requireAdmin`（PR-2）
 * - RLS（migration 045 / 046, ADR 0008）
 * が多層で担っており、本ヘルパーの戻り値を信用して認可を行ってはならない。
 */
export async function getSessionRole(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role: unknown = session?.user.app_metadata.role;
  return typeof role === "string" ? role : null;
}

/**
 * UI の表示出し分け専用。認可判定には使わないこと（上記コメント参照）。
 */
export function isAdminRole(role: string | null): boolean {
  return role === ADMIN_ROLE;
}
