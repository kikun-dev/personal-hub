"use server";

import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { upsertAttendance } from "@/usecases/upsertAttendance";
import { deleteAttendance } from "@/usecases/deleteAttendance";
import type { UpsertAttendanceInput } from "@/types/attendance";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";
import { isValidUuid } from "@/lib/validation";

// 参加記録はユーザー別データ（ADR 0009）で shared cache の対象外のため、
// admin 配下の他アクションのような revalidateOrbit* の呼び出しは不要
// （呼んでもグローバルデータのキャッシュタグが対象で参加記録には効かない）。
// 更新後の反映は呼び出し元コンポーネントの router.refresh() に任せる。

export async function upsertAttendanceAction(
  input: UpsertAttendanceInput
): Promise<{ errors?: ValidationError[] }> {
  const { supabase, user } = await requireOrbitUser();

  const repo = createAttendanceRepository(supabase);

  try {
    const result = await upsertAttendance(repo, user.id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "参戦記録の保存に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteAttendanceAction(
  performanceId: string
): Promise<{ error?: string }> {
  const { supabase } = await requireOrbitUser();

  // performanceId はクライアント入力の境界値（PR #253 レビュー指摘）。
  // repo呼び出し前に検証し、不正な値をDBまで到達させない。
  if (!performanceId || !isValidUuid(performanceId)) {
    return { error: "参戦記録の解除に失敗しました" };
  }

  const repo = createAttendanceRepository(supabase);

  try {
    await deleteAttendance(repo, performanceId);
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "参戦記録の解除に失敗しました" };
    }
    throw e;
  }
}
