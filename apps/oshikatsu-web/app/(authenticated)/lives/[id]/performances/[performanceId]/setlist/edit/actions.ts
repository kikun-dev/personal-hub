"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createLiveRepository } from "@/repositories/liveRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getSong } from "@/usecases/getSong";
import { validateSetlist } from "@/usecases/validateSetlist";
import { resolveOriginalMembers } from "@/usecases/resolveOriginalMembers";
import type { ResolveOriginalMembersResult } from "@/usecases/resolveOriginalMembers";
import { revalidateOrbitLiveData } from "@/lib/revalidateOrbit";
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
): Promise<ResolveOriginalMembersResult> {
  const supabase = await requireAdmin();

  const song = await getSong(createSongRepository(supabase), trackId);
  if (!song) {
    return { status: "blocked", reason: "no-track-participants" };
  }

  const live = await createLiveRepository(supabase).findById(liveId);
  const performance = live?.performances.find((p) => p.id === performanceId);
  if (!live || !performance) {
    return { status: "blocked", reason: "no-roster" };
  }

  const membershipPeriods = await createMemberRepository(
    supabase
  ).findMembershipPeriodsByGroup(song.groupId);

  return resolveOriginalMembers({
    trackParticipants: song.participants.map((participant) => ({
      memberId: participant.memberId,
      isCenter: participant.isCenter,
    })),
    trackFormationRows: song.formationRows
      .slice()
      .sort((a, b) => a.rowNumber - b.rowNumber)
      .map((row) => ({
        memberIds: row.members
          .slice()
          .sort((a, b) => a.slotOrder - b.slotOrder)
          .map((member) => member.memberId),
      })),
    rosterMemberIds: live.performerMembers.map((member) => member.memberId),
    absentMemberIds: performance.absences.map((absence) => absence.memberId),
    membershipByMemberId: new Map(
      membershipPeriods.map((period) => [
        period.memberId,
        { joinedAt: period.joinedAt, graduatedAt: period.graduatedAt },
      ])
    ),
    performanceDate: performance.performanceDate,
  });
}
