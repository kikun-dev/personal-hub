import { describe, expect, it } from "vitest";
import type { CreateReleaseInput } from "@/types/release";
import {
  getDefaultValues,
  toFormValues,
} from "@/components/admin/release/releaseFormValues";

// #443: 初期値ビルダは SSR / hydration の両方で走るため決定的である必要がある。
// 編集画面の経路は E2E がデータ有無で skip しうるので、ここで固定する。
function makeInput(overrides: Partial<CreateReleaseInput> = {}): CreateReleaseInput {
  return {
    title: "テストリリース",
    groupId: "11111111-1111-1111-1111-111111111111",
    releaseType: "single",
    numbering: "1",
    releaseDate: "2026-01-01",
    artworkPath: "",
    artworkPersonName: "",
    participantMemberIds: [],
    memberPositions: [],
    bonusVideos: [
      { edition: "A", title: "特典1", description: "" },
      { edition: "B", title: "特典2", description: "" },
    ],
    trackLinks: [{ trackId: "t1", trackNumber: "1" }],
    ...overrides,
  };
}

describe("releaseFormValues の初期キー", () => {
  it("getDefaultValues は毎回同じ値を返す", () => {
    expect(getDefaultValues()).toEqual(getDefaultValues());
  });

  it("toFormValues は同じ入力から毎回同じ値を返す", () => {
    const input = makeInput();

    expect(toFormValues(input)).toEqual(toFormValues(input));
  });

  it("配列ごとに scope 付きの決定的なキーを振る", () => {
    const values = toFormValues(makeInput());

    expect(values.bonusVideos.map((video) => video._key)).toEqual([
      "initial-bonus-0",
      "initial-bonus-1",
    ]);
    expect(values.trackLinks.map((link) => link._key)).toEqual(["initial-track-0"]);
  });

  it("異なる配列のキーが重複しない", () => {
    const values = toFormValues(makeInput());
    const keys = [
      ...values.bonusVideos.map((item) => item._key),
      ...values.trackLinks.map((item) => item._key),
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });
});
