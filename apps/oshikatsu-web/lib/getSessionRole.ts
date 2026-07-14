import { createClient } from "@personal-hub/supabase/server";

const ADMIN_ROLE = "admin";

/**
 * Server Component から Auth server への毎回の往復なしでロールを取得するヘルパー。
 *
 * `supabase.auth.getClaims()` は cookie の JWT を**署名検証してから** claims を
 * 返す（ES256 の検証鍵は初回の JWKS 取得後にキャッシュされるため、layout で毎回
 * `getUser`（ネットワーク往復）を行わない ADR 0006 の意図を維持できる）。
 * 未検証の `getSession().session.user` は参照しない（Issue #351）。
 * 取得エラー・claims 欠落・不正な role 型では `null` へ fail closed する。
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
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  const role: unknown = data.claims.app_metadata?.role;
  return typeof role === "string" ? role : null;
}

/**
 * UI の表示出し分け専用。認可判定には使わないこと（上記コメント参照）。
 */
export function isAdminRole(role: string | null): boolean {
  return role === ADMIN_ROLE;
}
