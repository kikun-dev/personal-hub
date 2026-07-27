import { describe, expect, it } from "vitest";
import type { CreateSpotInput } from "@/types/spot";
import { getDefaultValues, toFormValues } from "@/components/admin/spot/spotFormValues";

// #443: 写真（photos）も toFormValues でキーを振るため、同じ契約で固定する。
function makeInput(overrides: Partial<CreateSpotInput> = {}): CreateSpotInput {
  return {
    name: "東京タワー",
    description: "",
    latitude: "35.6586",
    longitude: "139.7454",
    address: "",
    prefecture: "",
    googlePlaceId: "",
    googleMapsUrl: "",
    appearances: [
      {
        sourceType: "mv",
        groupId: "g1",
        trackId: "t1",
        videoId: "",
        eventId: "",
        liveId: "",
        subtypeName: "",
        note: "",
        linkUrl: "",
        memberIds: [],
      },
    ],
    photos: [
      { imagePath: "spot-photos/a.png", caption: "1枚目" },
      { imagePath: "spot-photos/b.png", caption: "2枚目" },
    ],
    ...overrides,
  };
}

describe("spotFormValues の初期キー", () => {
  it("getDefaultValues は毎回同じ値を返す", () => {
    expect(getDefaultValues()).toEqual(getDefaultValues());
  });

  it("toFormValues は同じ入力から毎回同じ値を返す", () => {
    const input = makeInput();

    expect(toFormValues(input)).toEqual(toFormValues(input));
  });

  it("出来事と写真それぞれに scope 付きの決定的なキーを振る", () => {
    const values = toFormValues(makeInput());

    expect(values.appearances.map((item) => item._key)).toEqual([
      "initial-appearance-0",
    ]);
    expect(values.photos.map((item) => item._key)).toEqual([
      "initial-photo-0",
      "initial-photo-1",
    ]);
  });

  it("異なる配列のキーが重複しない", () => {
    const values = toFormValues(makeInput());
    const keys = [
      ...values.appearances.map((item) => item._key),
      ...values.photos.map((item) => item._key),
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });
});
