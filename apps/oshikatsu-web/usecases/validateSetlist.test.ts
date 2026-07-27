import { describe, expect, it } from "vitest";
import type { SetlistEditorItemInput } from "@/types/live";
import { validateSetlist } from "@/usecases/validateSetlist";

function makeItem(overrides: Partial<SetlistEditorItemInput> = {}): SetlistEditorItemInput {
  return {
    itemType: "song",
    trackId: "11111111-1111-1111-1111-111111111111",
    note: "",
    section: "main",
    performanceStyles: [],
    costumeNote: "",
    members: [],
    formationRows: [],
    ...overrides,
  };
}

describe("validateSetlist", () => {
  it("楽曲項目でtrackId未選択の場合、items.0にValidationErrorを返す（#422 登録曲必須）", () => {
    const errors = validateSetlist([makeItem({ trackId: "" })], []);

    expect(errors).toContainEqual({
      field: "items.0",
      message: "楽曲は登録曲の選択が必要です",
    });
  });

  it("楽曲項目でtrackIdが選択されている場合、ValidationErrorは発生しない", () => {
    const errors = validateSetlist([makeItem()], []);

    expect(errors).toEqual([]);
  });

  it("楽曲項目のtrackIdが空白のみの場合、items.0にValidationErrorを返す（#422 P2 境界）", () => {
    const errors = validateSetlist([makeItem({ trackId: "   " })], []);

    expect(errors).toContainEqual({
      field: "items.0",
      message: "楽曲は登録曲の選択が必要です",
    });
  });

  it("楽曲項目のtrackIdがUUID形式でない場合、items.0にValidationErrorを返す（#422 P2 境界）", () => {
    const errors = validateSetlist([makeItem({ trackId: "not-a-uuid" })], []);

    expect(errors).toContainEqual({
      field: "items.0",
      message: "楽曲は登録曲の選択が必要です",
    });
  });

  it("楽曲以外の項目はtrackId未選択でもValidationErrorを返さない", () => {
    const errors = validateSetlist(
      [makeItem({ itemType: "mc", trackId: "" })],
      []
    );

    expect(errors).toEqual([]);
  });
});

// #423 / ADR 0007 追記 §5: 披露メンバーとフォーメーション・センターの整合を
// 楽曲登録（validateSong）と同じ不変条件で検証する。
const MEMBER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function performer(memberId: string, isCenter = false) {
  return { memberId, isCenter };
}

function messagesFor(
  errors: ReturnType<typeof validateSetlist>,
  field: string
): string[] {
  return errors.filter((error) => error.field === field).map((error) => error.message);
}

describe("validateSetlist のフォーメーション整合", () => {
  it("列人数と割当メンバー数が一致しなければエラーにする", () => {
    const errors = validateSetlist(
      [
        makeItem({
          members: [performer(MEMBER_A), performer(MEMBER_B)],
          formationRows: [{ memberCount: "3", memberIds: [MEMBER_A, MEMBER_B] }],
        }),
      ],
      []
    );

    expect(messagesFor(errors, "items.0.formationRows.0.memberIds")).toContain(
      "列人数と割当メンバー数を一致させてください"
    );
  });

  it("列人数が非負整数でなければエラーにする", () => {
    const errors = validateSetlist(
      [makeItem({ formationRows: [{ memberCount: "-1", memberIds: [] }] })],
      []
    );

    expect(messagesFor(errors, "items.0.formationRows.0.memberCount")).toContain(
      "列人数は0以上の整数で入力してください"
    );
  });

  // 空文字は Number("") = 0 として「0人の列」に正規化される（validateSong と同じ挙動）
  it("列人数が空文字なら0人の列として扱う", () => {
    const errors = validateSetlist(
      [makeItem({ formationRows: [{ memberCount: "", memberIds: [] }] })],
      []
    );

    expect(messagesFor(errors, "items.0.formationRows.0.memberCount")).toEqual([]);
  });

  it("披露メンバーが未配置ならエラーにする", () => {
    const errors = validateSetlist(
      [
        makeItem({
          members: [performer(MEMBER_A), performer(MEMBER_B)],
          formationRows: [{ memberCount: "1", memberIds: [MEMBER_A] }],
        }),
      ],
      []
    );

    expect(messagesFor(errors, "items.0.formationRows")).toContain(
      "披露メンバー1人がフォーメーションに配置されていません"
    );
  });

  it("披露メンバー外を配置したらエラーにする", () => {
    const errors = validateSetlist(
      [
        makeItem({
          members: [performer(MEMBER_A)],
          formationRows: [{ memberCount: "2", memberIds: [MEMBER_A, MEMBER_C] }],
        }),
      ],
      []
    );

    expect(messagesFor(errors, "items.0.formationRows")).toContain(
      "フォーメーションには披露メンバーだけを配置してください"
    );
  });

  it("完全一致していればフォーメーションのエラーは出ない", () => {
    const errors = validateSetlist(
      [
        makeItem({
          members: [performer(MEMBER_A), performer(MEMBER_B)],
          formationRows: [
            { memberCount: "1", memberIds: [MEMBER_A] },
            { memberCount: "1", memberIds: [MEMBER_B] },
          ],
        }),
      ],
      []
    );

    expect(messagesFor(errors, "items.0.formationRows")).toEqual([]);
  });

  it("フォーメーション未登録でも披露メンバーだけで保存できる", () => {
    const errors = validateSetlist(
      [makeItem({ members: [performer(MEMBER_A, true)], formationRows: [] })],
      []
    );

    expect(errors).toEqual([]);
  });
});

describe("validateSetlist のセンター整合", () => {
  it("センターが3人以上ならエラーにする", () => {
    const errors = validateSetlist(
      [
        makeItem({
          members: [
            performer(MEMBER_A, true),
            performer(MEMBER_B, true),
            performer(MEMBER_C, true),
          ],
        }),
      ],
      []
    );

    expect(messagesFor(errors, "items.0")).toContain("センターは最大2人まで指定できます");
  });

  it("フォーメーションがある場合、センターが1列目以外ならエラーにする", () => {
    const errors = validateSetlist(
      [
        makeItem({
          members: [performer(MEMBER_A), performer(MEMBER_B, true)],
          formationRows: [
            { memberCount: "1", memberIds: [MEMBER_A] },
            { memberCount: "1", memberIds: [MEMBER_B] },
          ],
        }),
      ],
      []
    );

    expect(messagesFor(errors, "items.0")).toContain(
      "センターは1列目のメンバーから選んでください"
    );
  });

  it("フォーメーションが無ければ1列目の制約は課さない", () => {
    const errors = validateSetlist(
      [makeItem({ members: [performer(MEMBER_A, true)], formationRows: [] })],
      []
    );

    expect(messagesFor(errors, "items.0")).toEqual([]);
  });

  it("センターが1列目に含まれていればエラーにしない", () => {
    const errors = validateSetlist(
      [
        makeItem({
          members: [performer(MEMBER_A, true), performer(MEMBER_B)],
          formationRows: [
            { memberCount: "1", memberIds: [MEMBER_A] },
            { memberCount: "1", memberIds: [MEMBER_B] },
          ],
        }),
      ],
      []
    );

    expect(messagesFor(errors, "items.0")).toEqual([]);
  });
});
