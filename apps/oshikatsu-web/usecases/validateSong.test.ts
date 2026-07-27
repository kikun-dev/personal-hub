import { describe, expect, it } from "vitest";
import type { CreateSongInput } from "@/types/song";
import { validateSong } from "@/usecases/validateSong";

const GROUP_ID = "11111111-1111-1111-1111-111111111111";
const RELEASE_ID = "22222222-2222-2222-2222-222222222222";
const MEMBER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MEMBER_D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function makeInput(overrides: Partial<CreateSongInput> = {}): CreateSongInput {
  return {
    title: "テスト楽曲",
    groupId: GROUP_ID,
    label: "",
    generation: "",
    releaseLinks: [{ releaseId: RELEASE_ID, trackNumber: "1" }],
    lyricsPeople: "",
    musicPeople: "",
    arrangementPeople: "",
    choreographyPeople: "",
    participantMemberIds: [],
    formationRows: [],
    centerMemberIds: [],
    mv: { url: "", directorName: "", location: "", publishedOn: "", memo: "" },
    videos: {
      dance_practice: { url: "", publishedOn: "", memo: "" },
      call: { url: "", publishedOn: "", memo: "" },
    },
    costumes: [],
    artistName: "",
    note: "",
    ...overrides,
  };
}

function centerErrors(errors: ReturnType<typeof validateSong>): string[] {
  return errors
    .filter((error) => error.field === "centerMemberIds")
    .map((error) => error.message);
}

// センターの正典は楽曲参加メンバー（ADR 0007 2026-07-24改訂 / #426）。
// 参加メンバーはフォームから独立入力できるようになる #427 まで、
// フォーメーション全列のメンバー集合を参加メンバーとみなす。
describe("validateSong のセンター検証", () => {
  it("フォーメーションが無く、センターも無ければエラーにならない", () => {
    const errors = validateSong(makeInput());

    expect(centerErrors(errors)).toEqual([]);
  });

  it("フォーメーション1列目のセンターを受け付ける", () => {
    const errors = validateSong(
      makeInput({
        participantMemberIds: [MEMBER_A, MEMBER_B, MEMBER_C],
        formationRows: [
          { memberCount: "2", memberIds: [MEMBER_A, MEMBER_B] },
          { memberCount: "1", memberIds: [MEMBER_C] },
        ],
        centerMemberIds: [MEMBER_A],
      })
    );

    expect(centerErrors(errors)).toEqual([]);
  });

  it("Wセンター（2人）を受け付ける", () => {
    const errors = validateSong(
      makeInput({
        participantMemberIds: [MEMBER_A, MEMBER_B, MEMBER_C],
        formationRows: [{ memberCount: "3", memberIds: [MEMBER_A, MEMBER_B, MEMBER_C] }],
        centerMemberIds: [MEMBER_A, MEMBER_B],
      })
    );

    expect(centerErrors(errors)).toEqual([]);
  });

  it("センターが3人以上ならエラーにする", () => {
    const errors = validateSong(
      makeInput({
        participantMemberIds: [MEMBER_A, MEMBER_B, MEMBER_C],
        formationRows: [{ memberCount: "3", memberIds: [MEMBER_A, MEMBER_B, MEMBER_C] }],
        centerMemberIds: [MEMBER_A, MEMBER_B, MEMBER_C],
      })
    );

    expect(centerErrors(errors)).toContain("センターは最大2人まで指定できます");
  });

  it("センターが参加メンバー外ならエラーにする", () => {
    const errors = validateSong(
      makeInput({
        participantMemberIds: [MEMBER_A, MEMBER_B],
        formationRows: [{ memberCount: "2", memberIds: [MEMBER_A, MEMBER_B] }],
        centerMemberIds: [MEMBER_D],
      })
    );

    expect(centerErrors(errors)).toContain("センターは参加メンバーから選んでください");
  });

  it("フォーメーションがある場合、センターが1列目以外ならエラーにする", () => {
    const errors = validateSong(
      makeInput({
        participantMemberIds: [MEMBER_A, MEMBER_B],
        formationRows: [
          { memberCount: "1", memberIds: [MEMBER_A] },
          { memberCount: "1", memberIds: [MEMBER_B] },
        ],
        centerMemberIds: [MEMBER_B],
      })
    );

    expect(centerErrors(errors)).toContain("センターは1列目のメンバーから選んでください");
  });

  it("参加メンバー外のセンターには、1列目エラーを重ねて出さない", () => {
    const errors = validateSong(
      makeInput({
        participantMemberIds: [MEMBER_A, MEMBER_B],
        formationRows: [
          { memberCount: "1", memberIds: [MEMBER_A] },
          { memberCount: "1", memberIds: [MEMBER_B] },
        ],
        centerMemberIds: [MEMBER_D],
      })
    );

    expect(centerErrors(errors)).toEqual(["センターは参加メンバーから選んでください"]);
  });
});

describe("validateSong のフォーメーション検証", () => {
  it("列人数と割当メンバー数が一致しなければエラーにする", () => {
    const errors = validateSong(
      makeInput({
        participantMemberIds: [MEMBER_A, MEMBER_B],
        formationRows: [{ memberCount: "3", memberIds: [MEMBER_A, MEMBER_B] }],
      })
    );

    expect(errors).toContainEqual({
      field: "formationRows.0.memberIds",
      message: "列人数と割当メンバー数を一致させてください",
    });
  });

  it("同じメンバーを複数列に割り当てたらエラーにする", () => {
    const errors = validateSong(
      makeInput({
        participantMemberIds: [MEMBER_A],
        formationRows: [
          { memberCount: "1", memberIds: [MEMBER_A] },
          { memberCount: "1", memberIds: [MEMBER_A] },
        ],
      })
    );

    expect(errors).toContainEqual({
      field: "formationRows",
      message: "同じメンバーを複数列に割り当てることはできません",
    });
  });

  it("フォーメーション未登録でも保存を妨げない", () => {
    const errors = validateSong(makeInput({ formationRows: [] }));

    expect(errors).toEqual([]);
  });
});
