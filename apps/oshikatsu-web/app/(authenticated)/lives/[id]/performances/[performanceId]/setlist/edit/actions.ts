"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createLiveRepository } from "@/repositories/liveRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { validateSetlist } from "@/usecases/validateSetlist";
import { resolveOriginalMembers } from "@/usecases/resolveOriginalMembers";
import type { ResolveOriginalMembersResult } from "@/usecases/resolveOriginalMembers";

// 業務上の停止（blocked）と、技術的な入力異常（invalid-input）を分ける。
// 同じ型へ押し込むと、UIが「未登録なので編集してください」という誤った導線を出す。
export type OriginalMembersActionResult =
  | ResolveOriginalMembersResult
  | { status: "invalid-input" };
import { revalidateOrbitLiveData } from "@/lib/revalidateOrbit";
import { isValidUuid } from "@/lib/validation";
import type { ReplaceSetlistInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function replacePerformanceSetlistAction(
  performanceId: string,
  input: ReplaceSetlistInput,
  rosterMemberIds: string[]
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();
  const validationErrors = validateSetlist(input.items, rosterMemberIds);
  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }
  const repo = createLiveRepository(supabase);
  try {
    await repo.replaceSetlist(performanceId, input);
    revalidateOrbitLiveData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { errors: [{ field: "_form", message: "セットリストの保存に失敗しました" }] };
    }
    throw e;
  }
}

// 楽曲マスタの「オリメン」を、この公演の披露メンバー・センター・フォーメーションへ
// 反映する内容を確定して返す（#424）。
//
// クライアントからは trackId / liveId / performanceId だけを受け取り、
// 在籍履歴・ロスター・休演・公演日はすべてサーバで取得し直す。
// 分類（卒業・休演など）をクライアントから受け取らないための境界。
export async function resolveOriginalMembersAction(
  trackId: string,
  liveId: string,
  performanceId: string
): Promise<OriginalMembersActionResult> {
  // 認可は入力の妥当性より先に完了させる。入力値によって Server Action の
  // 認可動作が変わらないようにするため（rules/sakalog.md の Server Action 境界）。
  const supabase = await requireAdmin();

  // クライアント由来のIDはUUID形式まで境界で検証する。業務上の未登録とは
  // 別の状態なので、blocked へ変換せず invalid-input として返す。
  if (
    !isValidUuid(trackId) ||
    !isValidUuid(liveId) ||
    !isValidUuid(performanceId)
  ) {
    return { status: "invalid-input" };
  }

  // 反映に必要な事実だけを、互いに独立なので並列で取得する。
  // 楽曲詳細やライブ配下の全公演・全セットリストは使わない。
  const [trackSource, rosterContext] = await Promise.all([
    createSongRepository(supabase).findOriginalMemberSource(trackId),
    createLiveRepository(supabase).findPerformanceRosterContext(liveId, performanceId),
  ]);

  // 対象が見つからない場合は、参加メンバー未登録やロスター未登録とは別の状態。
  // 編集導線を出さず、汎用エラーとして扱わせる。
  if (!trackSource || !rosterContext) {
    return { status: "invalid-input" };
  }

  const membershipPeriods = await createMemberRepository(
    supabase
  ).findMembershipPeriodsByGroup(trackSource.groupId);

  return resolveOriginalMembers({
    trackParticipants: trackSource.participants,
    trackFormationRows: trackSource.formationRows,
    rosterMemberIds: rosterContext.rosterMemberIds,
    absentMemberIds: rosterContext.absentMemberIds,
    membershipByMemberId: new Map(
      membershipPeriods.map((period) => [
        period.memberId,
        { joinedAt: period.joinedAt, graduatedAt: period.graduatedAt },
      ])
    ),
    performanceDate: rosterContext.performanceDate,
  });
}
