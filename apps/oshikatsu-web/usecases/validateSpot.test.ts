import { describe, expect, it } from "vitest";
import type { CreateSpotAppearanceInput, CreateSpotInput } from "@/types/spot";
import { validateSpot } from "@/usecases/validateSpot";

const GROUP_ID = "11111111-1111-1111-1111-111111111111";
const TRACK_ID = "22222222-2222-2222-2222-222222222222";
const VIDEO_ID = "33333333-3333-3333-3333-333333333333";

function makeAppearance(
  overrides: Partial<CreateSpotAppearanceInput> = {}
): CreateSpotAppearanceInput {
  return {
    sourceType: "mv",
    groupId: GROUP_ID,
    trackId: TRACK_ID,
    videoId: "",
    eventId: "",
    liveId: "",
    subtypeName: "",
    note: "",
    linkUrl: "",
    memberIds: [],
    ...overrides,
  };
}

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
    appearances: [makeAppearance()],
    photos: [],
    ...overrides,
  };
}

describe("validateSpot", () => {
  it("必須項目が未入力の場合、各フィールドのValidationErrorを返す", () => {
    const errors = validateSpot(
      makeInput({ name: "", latitude: "", longitude: "", appearances: [] })
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        { field: "name", message: "スポット名を入力してください" },
        { field: "latitude", message: "緯度を入力してください" },
        { field: "longitude", message: "経度を入力してください" },
        { field: "appearances", message: "出来事を1件以上登録してください" },
      ])
    );
  });

  it("緯度・経度が範囲外の場合、ValidationErrorを返す", () => {
    const errors = validateSpot(makeInput({ latitude: "100", longitude: "200" }));

    expect(errors).toEqual(
      expect.arrayContaining([
        { field: "latitude", message: "緯度は-90〜90の数値で入力してください" },
        { field: "longitude", message: "経度は-180〜180の数値で入力してください" },
      ])
    );
  });

  it("出典種別と対応しないFKが指定されている場合、不一致のValidationErrorを返す", () => {
    const errors = validateSpot(
      makeInput({
        appearances: [makeAppearance({ sourceType: "mv", trackId: "", videoId: VIDEO_ID })],
      })
    );

    expect(errors).toContainEqual({
      field: "appearances[0].sourceType",
      message: "出典種別と出典の指定が一致していません",
    });
  });

  it("メンバーIDが重複している場合、ValidationErrorを返す", () => {
    const errors = validateSpot(
      makeInput({
        appearances: [makeAppearance({ memberIds: [GROUP_ID, GROUP_ID] })],
      })
    );

    expect(errors).toContainEqual({
      field: "appearances[0].memberIds",
      message: "メンバーが重複しています",
    });
  });

  it("正常な入力の場合、ValidationErrorは空配列になる", () => {
    const errors = validateSpot(makeInput());

    expect(errors).toEqual([]);
  });
});
