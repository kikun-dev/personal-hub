/**
 * 楽曲マスタの「オリメン」をセットリストの披露メンバーへ反映する導出（#424）。
 *
 * #425 のDecisionにより「オリメン」= 楽曲参加メンバー（`orbit_track_members`）。
 * 反映対象 = オリメン ∩ 公演の出演可能メンバー（ライブ基準ロスター − 当該公演の休演）。
 * さらに、対象楽曲グループの在籍履歴と公演日から未加入・卒業を判定して除外する。
 *
 * 判定に必要な事実をすべて引数で受け取る純関数にしてある。呼び出し側（Server Action）が
 * DBからの取得を担い、クライアント由来の分類は受け取らない。
 */

/**
 * 除外理由。1人が複数に該当しうるため、この配列順を優先順位として
 * **最初に一致した理由だけ**を割り当てる。件数の合計が重複しないようにするため。
 *
 * 未加入 → 卒業 → 休演 → ロスター外 の順。
 * 在籍していない期間の判定を先に置き、公演固有の事情（休演）、
 * 運用上の登録漏れ（ロスター外）を後に置く。
 */
export const EXCLUSION_REASON_PRIORITY = [
  "not-yet-joined",
  "graduated",
  "absent",
  "not-in-roster",
] as const;

export type ExclusionReason = (typeof EXCLUSION_REASON_PRIORITY)[number];

/**
 * 操作を止める理由。既存入力は変更しない。
 *
 * `inconsistent-track-data` は楽曲マスタ側が既に不整合な場合。
 * 現在の保存境界（validateSong / RPC）は不整合を弾くが、旧データや
 * DBへの直接更新で生じうる。除外加工だけでは
 * 「反映メンバー集合 == フォーメーション集合」を保証できないため、
 * 黙って読み替えず楽曲編集へ誘導する。
 */
export type BlockedReason =
  | "no-track-participants"
  | "inconsistent-track-data"
  | "no-roster";

export type TrackParticipant = { memberId: string; isCenter: boolean };

/** 対象楽曲グループにおける在籍履歴。日付は YYYY-MM-DD。 */
export type MembershipPeriod = {
  joinedAt: string | null;
  graduatedAt: string | null;
};

export type ResolveOriginalMembersInput = {
  trackParticipants: TrackParticipant[];
  trackFormationRows: Array<{ memberIds: string[] }>;
  rosterMemberIds: string[];
  absentMemberIds: string[];
  membershipByMemberId: ReadonlyMap<string, MembershipPeriod>;
  /** 公演日。未登録なら在籍判定（未加入 / 卒業）を行わない。 */
  performanceDate: string | null;
};

export type ResolveOriginalMembersResult =
  | { status: "blocked"; reason: BlockedReason }
  | {
      status: "applied";
      members: TrackParticipant[];
      formationRows: Array<{ memberCount: string; memberIds: string[] }>;
      /** 優先順位順。該当0人の理由は含めない。 */
      exclusions: Array<{ reason: ExclusionReason; memberIds: string[] }>;
      /**
       * 公演日が未登録のため在籍判定（未加入 / 卒業）を行わなかったか。
       * true のとき、卒業済みメンバーが反映対象へ残りうる。
       */
      isMembershipCheckSkipped: boolean;
    };

/**
 * 公演日時点でその楽曲グループに在籍していない理由を返す。
 *
 * - 未加入: 加入日が公演日より後
 * - 卒業: 卒業日が公演日より前（卒業日当日は在籍扱い。卒業セレモニー公演があるため）
 *
 * 公演日が未登録、または在籍履歴が無い場合は `null`（= この判定では除外しない）。
 * **「在籍判定の対象外」であって「反映対象外」ではない**。履歴が無いことを
 * 在籍していない根拠に読み替えると、所属履歴が未登録なだけのメンバーを
 * 黙って落としてしまうため。休演・ロスター外の判定は別途行われる。
 */
function resolveMembershipExclusion(
  membership: MembershipPeriod | undefined,
  performanceDate: string | null
): ExclusionReason | null {
  if (!performanceDate || !membership) return null;

  if (membership.joinedAt && membership.joinedAt > performanceDate) {
    return "not-yet-joined";
  }
  if (membership.graduatedAt && membership.graduatedAt < performanceDate) {
    return "graduated";
  }
  return null;
}

/**
 * 楽曲マスタ側が ADR 0007 追記 §1 / §2 の不変条件を満たしているか。
 * 満たさない場合、除外加工をしても反映結果が整合しないため反映しない。
 *
 * - センターは楽曲参加メンバー内
 * - フォーメーションがある場合、全列のメンバー集合と参加メンバー集合が完全一致
 * - フォーメーション内で同一メンバーが重複しない
 * - フォーメーションがある場合、センターは1列目に含まれる
 */
function isTrackSourceConsistent(
  input: ResolveOriginalMembersInput,
  nonEmptyRows: Array<{ memberIds: string[] }>
): boolean {
  const participantIds = new Set(
    input.trackParticipants.map((participant) => participant.memberId)
  );
  const centerIds = input.trackParticipants
    .filter((participant) => participant.isCenter)
    .map((participant) => participant.memberId);

  if (centerIds.some((memberId) => !participantIds.has(memberId))) {
    return false;
  }

  // 空列は事前に除去済み。行が残っていなければフォーメーション未登録として扱い、
  // 完全一致とセンター1列目の判定は課さない。
  if (nonEmptyRows.length === 0) {
    return true;
  }

  const assignedIds = nonEmptyRows.flatMap((row) => row.memberIds);
  const uniqueAssignedIds = new Set(assignedIds);
  if (uniqueAssignedIds.size !== assignedIds.length) {
    return false;
  }
  if (uniqueAssignedIds.size !== participantIds.size) {
    return false;
  }
  if (Array.from(uniqueAssignedIds).some((memberId) => !participantIds.has(memberId))) {
    return false;
  }

  // 空列を除いたうえでの先頭行を1列目とする
  const frontRowIds = new Set(nonEmptyRows[0].memberIds);
  return centerIds.every((memberId) => frontRowIds.has(memberId));
}

export function resolveOriginalMembers(
  input: ResolveOriginalMembersInput
): ResolveOriginalMembersResult {
  // ソース整合性の検証より前に空列を除去する。空列の有無で「1列目」や
  // 「フォーメーションの有無」の判定が変わらないようにするため。
  const nonEmptyRows = input.trackFormationRows.filter(
    (row) => row.memberIds.length > 0
  );

  // 停止判定は「反映対象の有無」→「ソースの整合」→「反映先の有無」の順で見る。
  if (input.trackParticipants.length === 0) {
    return { status: "blocked", reason: "no-track-participants" };
  }
  if (!isTrackSourceConsistent(input, nonEmptyRows)) {
    return { status: "blocked", reason: "inconsistent-track-data" };
  }
  if (input.rosterMemberIds.length === 0) {
    return { status: "blocked", reason: "no-roster" };
  }

  const rosterIds = new Set(input.rosterMemberIds);
  const absentIds = new Set(input.absentMemberIds);

  const excludedByReason = new Map<ExclusionReason, string[]>();
  const appliedParticipants: TrackParticipant[] = [];

  for (const participant of input.trackParticipants) {
    const membershipExclusion = resolveMembershipExclusion(
      input.membershipByMemberId.get(participant.memberId),
      input.performanceDate
    );

    // EXCLUSION_REASON_PRIORITY の順で最初に一致した理由だけを割り当てる
    const reason: ExclusionReason | null =
      membershipExclusion ??
      (absentIds.has(participant.memberId)
        ? "absent"
        : !rosterIds.has(participant.memberId)
          ? "not-in-roster"
          : null);

    if (reason === null) {
      appliedParticipants.push(participant);
      continue;
    }

    const current = excludedByReason.get(reason) ?? [];
    current.push(participant.memberId);
    excludedByReason.set(reason, current);
  }

  const appliedIds = new Set(
    appliedParticipants.map((participant) => participant.memberId)
  );

  // フォーメーションからも除外対象を取り除き、反映直後から
  // 「配置集合 == 披露メンバー集合」を満たす状態にする（#423 の不変条件）。
  const formationRows = nonEmptyRows
    .map((row) => row.memberIds.filter((memberId) => appliedIds.has(memberId)))
    .filter((memberIds) => memberIds.length > 0)
    .map((memberIds) => ({ memberCount: String(memberIds.length), memberIds }));

  const exclusions = EXCLUSION_REASON_PRIORITY.flatMap((reason) => {
    const memberIds = excludedByReason.get(reason);
    return memberIds && memberIds.length > 0 ? [{ reason, memberIds }] : [];
  });

  return {
    status: "applied",
    members: appliedParticipants,
    formationRows,
    exclusions,
    isMembershipCheckSkipped: input.performanceDate === null,
  };
}
