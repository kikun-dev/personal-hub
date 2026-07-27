import { describe, expect, it } from "vitest";
import type { CreateMemberInput } from "@/types/member";
import {
  getDefaultValues,
  toFormValues,
} from "@/components/admin/member/memberFormValues";

/**
 * #443: 初期値ビルダは SSR と client hydration の両方で実行されるため、
 * 同じ入力から常に同じ `_key` を返す必要がある。
 *
 * 編集画面（`toFormValues`）の経路は E2E でも見ているが、対象データが無い環境では
 * skip されるため、DBデータに依存しないここで固定する。
 */

function makeInput(overrides: Partial<CreateMemberInput> = {}): CreateMemberInput {
  return {
    nameJa: "テスト メンバー",
    nameKana: "てすと めんばー",
    nameEn: "Test Member",
    dateOfBirth: "2000-01-01",
    bloodType: "A",
    callName: "てすと",
    penlightColor1: "レッド",
    penlightColor2: "ホワイト",
    heightCm: "160",
    hometown: "東京都",
    memo: "",
    imageUrl: "",
    blogUrl: "",
    blogHashtag: "",
    talkAppName: "",
    talkAppUrl: "",
    talkAppHashtag: "",
    groups: [
      {
        groupId: "11111111-1111-1111-1111-111111111111",
        generation: "1期生",
        joinedAt: "2015-08-01",
        graduatedAt: "",
      },
      {
        groupId: "22222222-2222-2222-2222-222222222222",
        generation: "",
        joinedAt: "2020-04-01",
        graduatedAt: "",
      },
    ],
    sns: [
      { snsType: "x", displayName: "test", url: "https://x.com/test", hashtag: "" },
      { snsType: "instagram", displayName: "test", url: "https://example.com", hashtag: "" },
    ],
    ...overrides,
  };
}

describe("memberFormValues の初期キー", () => {
  it("getDefaultValues は毎回同じ値を返す", () => {
    expect(getDefaultValues()).toEqual(getDefaultValues());
  });

  it("toFormValues は同じ入力から毎回同じ値を返す", () => {
    const input = makeInput();

    expect(toFormValues(input)).toEqual(toFormValues(input));
  });

  it("配列ごとに scope 付きの決定的なキーを振る", () => {
    const values = toFormValues(makeInput());

    expect(values.groups.map((group) => group._key)).toEqual([
      "initial-group-0",
      "initial-group-1",
    ]);
    expect(values.sns.map((sns) => sns._key)).toEqual([
      "initial-sns-0",
      "initial-sns-1",
    ]);
  });

  // 同一ページ内の別配列と id が衝突しないこと
  it("異なる配列のキーが重複しない", () => {
    const values = toFormValues(makeInput());
    const keys = [
      ...values.groups.map((item) => item._key),
      ...values.sns.map((item) => item._key),
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("入力が空でも決定的に振る舞う", () => {
    const input = makeInput({ groups: [], sns: [] });

    expect(toFormValues(input)).toEqual(toFormValues(input));
  });
});
