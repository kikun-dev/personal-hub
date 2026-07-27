import { describe, expect, it } from "vitest";
import {
  EXCLUSION_REASON_PRIORITY,
  resolveOriginalMembers,
  type MembershipPeriod,
  type ResolveOriginalMembersInput,
} from "@/usecases/resolveOriginalMembers";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const PERFORMANCE_DATE = "2026-06-01";

function membership(
  entries: Array<[string, MembershipPeriod]>
): Map<string, MembershipPeriod> {
  return new Map(entries);
}

function makeInput(
  overrides: Partial<ResolveOriginalMembersInput> = {}
): ResolveOriginalMembersInput {
  return {
    trackParticipants: [
      { memberId: A, isCenter: true },
      { memberId: B, isCenter: false },
    ],
    trackFormationRows: [{ memberIds: [A, B] }],
    rosterMemberIds: [A, B],
    absentMemberIds: [],
    membershipByMemberId: membership([]),
    performanceDate: PERFORMANCE_DATE,
    ...overrides,
  };
}

function applied(result: ReturnType<typeof resolveOriginalMembers>) {
  if (result.status !== "applied") {
    throw new Error(`expected applied, got blocked: ${result.reason}`);
  }
  return result;
}

describe("resolveOriginalMembers の操作停止", () => {
  it("楽曲参加メンバーが未登録なら停止し、理由を返す", () => {
    const result = resolveOriginalMembers(makeInput({ trackParticipants: [] }));

    expect(result).toEqual({ status: "blocked", reason: "no-track-participants" });
  });

  it("ライブ基準ロスターが未登録なら停止し、理由を返す", () => {
    const result = resolveOriginalMembers(makeInput({ rosterMemberIds: [] }));

    expect(result).toEqual({ status: "blocked", reason: "no-roster" });
  });

  // 停止判定の順序を固定する。反映対象が無い方を先に見る。
  it("両方未登録なら楽曲参加メンバー未登録を優先して返す", () => {
    const result = resolveOriginalMembers(
      makeInput({ trackParticipants: [], rosterMemberIds: [] })
    );

    expect(result).toEqual({ status: "blocked", reason: "no-track-participants" });
  });
});

describe("resolveOriginalMembers の集合演算", () => {
  it("オリメン ∩ 出演可能メンバーだけを反映する", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: true },
            { memberId: B, isCenter: false },
            { memberId: C, isCenter: false },
          ],
          trackFormationRows: [],
          rosterMemberIds: [A, B],
        })
      )
    );

    expect(result.members.map((member) => member.memberId)).toEqual([A, B]);
  });

  it("センター指定は反映対象に残った場合だけ引き継ぐ", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: true },
            { memberId: B, isCenter: false },
          ],
        })
      )
    );

    expect(result.members).toEqual([
      { memberId: A, isCenter: true },
      { memberId: B, isCenter: false },
    ]);
  });

  it("センターが除外されたら反映結果にセンターが残らない", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: true },
            { memberId: B, isCenter: false },
          ],
          absentMemberIds: [A],
        })
      )
    );

    expect(result.members.some((member) => member.isCenter)).toBe(false);
  });
});

describe("resolveOriginalMembers の在籍判定", () => {
  it("公演日より後に加入したメンバーを未加入として除外する", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          membershipByMemberId: membership([
            [B, { joinedAt: "2026-07-01", graduatedAt: null }],
          ]),
        })
      )
    );

    expect(result.exclusions).toEqual([{ reason: "not-yet-joined", memberIds: [B] }]);
    expect(result.members.map((member) => member.memberId)).toEqual([A]);
  });

  it("公演日より前に卒業したメンバーを卒業として除外する", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          membershipByMemberId: membership([
            [B, { joinedAt: "2020-01-01", graduatedAt: "2026-05-31" }],
          ]),
        })
      )
    );

    expect(result.exclusions).toEqual([{ reason: "graduated", memberIds: [B] }]);
  });

  // 卒業セレモニー公演があるため、卒業日当日は在籍扱いにする
  it("卒業日が公演日と同日なら在籍扱いにする", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          membershipByMemberId: membership([
            [B, { joinedAt: "2020-01-01", graduatedAt: PERFORMANCE_DATE }],
          ]),
        })
      )
    );

    expect(result.exclusions).toEqual([]);
    expect(result.members.map((member) => member.memberId)).toEqual([A, B]);
  });

  it("加入日が公演日と同日なら在籍扱いにする", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          membershipByMemberId: membership([
            [B, { joinedAt: PERFORMANCE_DATE, graduatedAt: null }],
          ]),
        })
      )
    );

    expect(result.exclusions).toEqual([]);
  });

  // 履歴が無いことを「在籍していない」根拠に読み替えない。
  // 判定対象外であって、反映対象外ではない。
  it("在籍履歴が無いメンバーは在籍判定の対象外とし、反映対象には残す", () => {
    const result = applied(resolveOriginalMembers(makeInput()));

    expect(result.exclusions).toEqual([]);
    expect(result.isMembershipCheckSkipped).toBe(false);
    expect(result.members.map((member) => member.memberId)).toEqual([A, B]);
  });

  it("履歴のあるメンバーだけを判定し、履歴の無いメンバーは反映する", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          membershipByMemberId: membership([
            [A, { joinedAt: "2020-01-01", graduatedAt: "2025-01-01" }],
          ]),
          trackParticipants: [
            { memberId: A, isCenter: false },
            { memberId: B, isCenter: false },
          ],
          trackFormationRows: [],
        })
      )
    );

    expect(result.exclusions).toEqual([{ reason: "graduated", memberIds: [A] }]);
    expect(result.members.map((member) => member.memberId)).toEqual([B]);
  });

  // 公演日が無いと在籍判定ができない。推測せず、判定しなかったことを呼び出し側へ伝える
  it("公演日が未登録なら在籍判定を行わず、その事実を返す", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          performanceDate: null,
          membershipByMemberId: membership([
            [B, { joinedAt: "2020-01-01", graduatedAt: "2020-12-31" }],
          ]),
        })
      )
    );

    expect(result.isMembershipCheckSkipped).toBe(true);
    expect(result.exclusions).toEqual([]);
    expect(result.members.map((member) => member.memberId)).toEqual([A, B]);
  });

  it("公演日が未登録でも休演とロスター外は判定する", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: false },
            { memberId: B, isCenter: false },
            { memberId: C, isCenter: false },
          ],
          trackFormationRows: [],
          rosterMemberIds: [A, B],
          absentMemberIds: [B],
          performanceDate: null,
        })
      )
    );

    expect(result.exclusions).toEqual([
      { reason: "absent", memberIds: [B] },
      { reason: "not-in-roster", memberIds: [C] },
    ]);
  });
});

// 1人が複数理由に該当しても、件数の合計が重複しないよう1つだけ割り当てる
describe("resolveOriginalMembers の除外理由の優先順位", () => {
  it("優先順位は 未加入 → 卒業 → 休演 → ロスター外", () => {
    expect(EXCLUSION_REASON_PRIORITY).toEqual([
      "not-yet-joined",
      "graduated",
      "absent",
      "not-in-roster",
    ]);
  });

  it("卒業かつ休演なら卒業として数える", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          absentMemberIds: [B],
          membershipByMemberId: membership([
            [B, { joinedAt: "2020-01-01", graduatedAt: "2025-01-01" }],
          ]),
        })
      )
    );

    expect(result.exclusions).toEqual([{ reason: "graduated", memberIds: [B] }]);
  });

  it("卒業かつロスター外なら卒業として数える", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          rosterMemberIds: [A],
          membershipByMemberId: membership([
            [B, { joinedAt: "2020-01-01", graduatedAt: "2025-01-01" }],
          ]),
        })
      )
    );

    expect(result.exclusions).toEqual([{ reason: "graduated", memberIds: [B] }]);
  });

  it("休演かつロスター外なら休演として数える", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({ rosterMemberIds: [A], absentMemberIds: [B] })
      )
    );

    expect(result.exclusions).toEqual([{ reason: "absent", memberIds: [B] }]);
  });

  it("複数理由が混在しても各メンバーは1度だけ数える", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: false },
            { memberId: B, isCenter: false },
            { memberId: C, isCenter: false },
            { memberId: D, isCenter: false },
          ],
          trackFormationRows: [],
          rosterMemberIds: [A],
          absentMemberIds: [C],
          membershipByMemberId: membership([
            [B, { joinedAt: "2020-01-01", graduatedAt: "2025-01-01" }],
          ]),
        })
      )
    );

    const excludedCount = result.exclusions.reduce(
      (total, exclusion) => total + exclusion.memberIds.length,
      0
    );
    expect(excludedCount).toBe(3);
    expect(result.exclusions).toEqual([
      { reason: "graduated", memberIds: [B] },
      { reason: "absent", memberIds: [C] },
      { reason: "not-in-roster", memberIds: [D] },
    ]);
  });

  it("該当0人の理由は含めない", () => {
    const result = applied(resolveOriginalMembers(makeInput()));

    expect(result.exclusions).toEqual([]);
  });
});

describe("resolveOriginalMembers のフォーメーション反映", () => {
  it("除外されたメンバーを配置からも取り除く", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: false },
            { memberId: B, isCenter: false },
            { memberId: C, isCenter: false },
          ],
          trackFormationRows: [{ memberIds: [A, C] }, { memberIds: [B] }],
          rosterMemberIds: [A, B],
        })
      )
    );

    expect(result.formationRows).toEqual([
      { memberCount: "1", memberIds: [A] },
      { memberCount: "1", memberIds: [B] },
    ]);
  });

  it("全員除外された列は落とす", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: false },
            { memberId: C, isCenter: false },
          ],
          trackFormationRows: [{ memberIds: [A] }, { memberIds: [C] }],
          rosterMemberIds: [A],
        })
      )
    );

    expect(result.formationRows).toEqual([{ memberCount: "1", memberIds: [A] }]);
  });

  it("反映後も 配置集合 == 披露メンバー集合 を満たす", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: true },
            { memberId: B, isCenter: false },
            { memberId: C, isCenter: false },
          ],
          trackFormationRows: [{ memberIds: [A, B] }, { memberIds: [C] }],
          rosterMemberIds: [A, B],
        })
      )
    );

    const assigned = new Set(result.formationRows.flatMap((row) => row.memberIds));
    const members = new Set(result.members.map((member) => member.memberId));

    expect(assigned).toEqual(members);
  });

  it("楽曲マスタにフォーメーションが無ければ空のまま返す", () => {
    const result = applied(
      resolveOriginalMembers(makeInput({ trackFormationRows: [] }))
    );

    expect(result.formationRows).toEqual([]);
    expect(result.members).toHaveLength(2);
  });

  it("列内の並び順を保つ", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: false },
            { memberId: B, isCenter: false },
          ],
          trackFormationRows: [{ memberIds: [B, A] }],
        })
      )
    );

    expect(result.formationRows[0].memberIds).toEqual([B, A]);
  });
});

// 現在の保存境界（validateSong / RPC）は不整合を弾くが、旧データやDBへの直接更新で
// 生じうる。除外加工だけでは反映後の完全一致を保証できないため、反映せず停止する。
describe("resolveOriginalMembers のソース不整合", () => {
  it("参加メンバーがフォーメーションに含まれていなければ停止する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: false },
          { memberId: B, isCenter: false },
        ],
        trackFormationRows: [{ memberIds: [A] }],
      })
    );

    expect(result).toEqual({ status: "blocked", reason: "inconsistent-track-data" });
  });

  it("フォーメーションに参加メンバー外が配置されていれば停止する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [{ memberId: A, isCenter: false }],
        trackFormationRows: [{ memberIds: [A, C] }],
      })
    );

    expect(result).toEqual({ status: "blocked", reason: "inconsistent-track-data" });
  });

  it("センターが参加メンバー外なら停止する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [{ memberId: A, isCenter: false }],
        trackFormationRows: [{ memberIds: [A] }],
        // 参加メンバーに居ない C がセンター指定されている状態を模す
        membershipByMemberId: membership([]),
      })
    );
    expect(result.status).toBe("applied");

    const inconsistent = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: false },
          { memberId: C, isCenter: true },
        ],
        trackFormationRows: [{ memberIds: [A] }],
      })
    );
    expect(inconsistent).toEqual({
      status: "blocked",
      reason: "inconsistent-track-data",
    });
  });

  it("フォーメーションで同一メンバーが重複していれば停止する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: false },
          { memberId: B, isCenter: false },
        ],
        trackFormationRows: [{ memberIds: [A, B] }, { memberIds: [A] }],
      })
    );

    expect(result).toEqual({ status: "blocked", reason: "inconsistent-track-data" });
  });

  it("フォーメーションがあるのにセンターが1列目外なら停止する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: false },
          { memberId: B, isCenter: true },
        ],
        trackFormationRows: [{ memberIds: [A] }, { memberIds: [B] }],
      })
    );

    expect(result).toEqual({ status: "blocked", reason: "inconsistent-track-data" });
  });

  it("フォーメーション未登録ならセンターの1列目判定は課さない", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: true },
          { memberId: B, isCenter: false },
        ],
        trackFormationRows: [],
      })
    );

    expect(result.status).toBe("applied");
  });

  it("列はあるが1人も配置されていない状態はフォーメーション未登録として扱う", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: true },
          { memberId: B, isCenter: false },
        ],
        trackFormationRows: [{ memberIds: [] }],
      })
    );

    expect(result.status).toBe("applied");
  });

  // 停止判定の順序を固定する
  it("参加メンバー未登録は、ソース不整合より先に判定する", () => {
    const result = resolveOriginalMembers(
      makeInput({ trackParticipants: [], trackFormationRows: [{ memberIds: [A] }] })
    );

    expect(result).toEqual({ status: "blocked", reason: "no-track-participants" });
  });

  it("ソース不整合は、ロスター未登録より先に判定する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: false },
          { memberId: B, isCenter: false },
        ],
        trackFormationRows: [{ memberIds: [A] }],
        rosterMemberIds: [],
      })
    );

    expect(result).toEqual({ status: "blocked", reason: "inconsistent-track-data" });
  });
});

// 空列の有無で「1列目」や「フォーメーションの有無」の判定が変わらないことを固定する
describe("resolveOriginalMembers の空列の扱い", () => {
  it("空列を挟んでも完全一致の判定結果は変わらない", () => {
    const withEmptyRow = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: true },
          { memberId: B, isCenter: false },
        ],
        trackFormationRows: [{ memberIds: [A] }, { memberIds: [] }, { memberIds: [B] }],
      })
    );

    expect(withEmptyRow.status).toBe("applied");
  });

  it("先頭の空列は1列目とみなさない（センターは最初の非空列で判定する）", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: true },
          { memberId: B, isCenter: false },
        ],
        trackFormationRows: [{ memberIds: [] }, { memberIds: [A] }, { memberIds: [B] }],
      })
    );

    expect(result.status).toBe("applied");
  });

  it("先頭の空列を除いた1列目にセンターが居なければ停止する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: false },
          { memberId: B, isCenter: true },
        ],
        trackFormationRows: [{ memberIds: [] }, { memberIds: [A] }, { memberIds: [B] }],
      })
    );

    expect(result).toEqual({ status: "blocked", reason: "inconsistent-track-data" });
  });

  it("空列は反映結果に残さない", () => {
    const result = applied(
      resolveOriginalMembers(
        makeInput({
          trackParticipants: [
            { memberId: A, isCenter: true },
            { memberId: B, isCenter: false },
          ],
          trackFormationRows: [{ memberIds: [A] }, { memberIds: [] }, { memberIds: [B] }],
        })
      )
    );

    expect(result.formationRows).toEqual([
      { memberCount: "1", memberIds: [A] },
      { memberCount: "1", memberIds: [B] },
    ]);
  });
});

// センター上限（最大2人）はセットリスト側の保存境界でも検証される。
// ソース側が超過している場合に反映すると、保存で拒否されて
// 「不整合なソースでは既存入力を変更しない」方針が崩れる。
describe("resolveOriginalMembers のセンター上限", () => {
  it("楽曲マスタのセンターが3人以上なら停止する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: true },
          { memberId: B, isCenter: true },
          { memberId: C, isCenter: true },
        ],
        trackFormationRows: [],
        rosterMemberIds: [A, B, C],
      })
    );

    expect(result).toEqual({ status: "blocked", reason: "inconsistent-track-data" });
  });

  it("センター2人（Wセンター）は反映する", () => {
    const result = resolveOriginalMembers(
      makeInput({
        trackParticipants: [
          { memberId: A, isCenter: true },
          { memberId: B, isCenter: true },
        ],
        trackFormationRows: [],
      })
    );

    expect(result.status).toBe("applied");
  });
});
