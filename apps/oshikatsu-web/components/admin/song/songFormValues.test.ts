import { describe, expect, it } from "vitest";
import type { CreateSongInput } from "@/types/song";
import { getDefaultValues, toFormValues } from "@/components/admin/song/songFormValues";

/**
 * #443: 初期値ビルダは SSR と client hydration の両方で実行されるため、
 * 同じ入力から常に同じ `_key` を返す必要がある。
 *
 * 編集画面（`toFormValues`）の経路は E2E でも見ているが、対象データが無い環境では
 * skip されるため、DBデータに依存しないここで固定する。
 */

function makeInput(overrides: Partial<CreateSongInput> = {}): CreateSongInput {
  return {
    title: "テスト楽曲",
    groupId: "11111111-1111-1111-1111-111111111111",
    label: "",
    generation: "",
    releaseLinks: [
      { releaseId: "r1", trackNumber: "1" },
      { releaseId: "r2", trackNumber: "5" },
    ],
    lyricsPeople: "",
    musicPeople: "",
    arrangementPeople: "",
    choreographyPeople: "",
    participantMemberIds: ["m1", "m2"],
    formationRows: [{ memberCount: "2", memberIds: ["m1", "m2"] }],
    centerMemberIds: ["m1"],
    mv: { url: "", directorName: "", location: "", publishedOn: "", memo: "" },
    videos: {
      dance_practice: { url: "", publishedOn: "", memo: "" },
      call: { url: "", publishedOn: "", memo: "" },
    },
    costumes: [{ stylistName: "s", imagePath: "costumes/a.png", note: "" }],
    artistName: "",
    note: "",
    ...overrides,
  };
}

describe("songFormValues の初期キー", () => {
  it("getDefaultValues は毎回同じ値を返す", () => {
    expect(getDefaultValues()).toEqual(getDefaultValues());
  });

  it("toFormValues は同じ入力から毎回同じ値を返す", () => {
    const input = makeInput();

    expect(toFormValues(input)).toEqual(toFormValues(input));
  });

  it("配列ごとに scope 付きの決定的なキーを振る", () => {
    const values = toFormValues(makeInput());

    expect(values.releaseLinks.map((link) => link._key)).toEqual([
      "initial-release-0",
      "initial-release-1",
    ]);
    expect(values.formationRows.map((row) => row._key)).toEqual([
      "initial-formation-0",
    ]);
    expect(values.costumes.map((costume) => costume._key)).toEqual([
      "initial-costume-0",
    ]);
  });

  // 同一ページ内の別配列と id が衝突しないこと
  it("異なる配列のキーが重複しない", () => {
    const values = toFormValues(makeInput());
    const keys = [
      ...values.releaseLinks.map((item) => item._key),
      ...values.formationRows.map((item) => item._key),
      ...values.costumes.map((item) => item._key),
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("入力が空でも決定的に振る舞う", () => {
    const input = makeInput({ releaseLinks: [], formationRows: [], costumes: [] });

    expect(toFormValues(input)).toEqual(toFormValues(input));
  });
});
