import { describe, expect, it } from "vitest";
import {
  buildParticipantChoices,
  selectedGenerationsForSummary,
  type ParticipantChoiceSource,
} from "@/lib/songParticipantChoices";

const IN_GROUP_1: ParticipantChoiceSource = {
  memberId: "m1",
  memberName: "あかり",
  memberKana: "あかり",
  generation: "1",
  isInSongGroup: true,
};
const IN_GROUP_2: ParticipantChoiceSource = {
  memberId: "m2",
  memberName: "さくら",
  memberKana: "さくら",
  generation: "2",
  isInSongGroup: true,
};
const OTHER_GROUP: ParticipantChoiceSource = {
  memberId: "m3",
  memberName: "ひなた",
  memberKana: "ひなた",
  generation: null,
  isInSongGroup: false,
};

const NAMES = new Map([
  ["m1", "あかり"],
  ["m2", "さくら"],
  ["m3", "ひなた"],
  ["gone1", "そつぎょう"],
  ["gone2", "あるばむ"],
]);

function build(overrides: Partial<Parameters<typeof buildParticipantChoices>[0]> = {}) {
  return buildParticipantChoices({
    options: [IN_GROUP_1, IN_GROUP_2, OTHER_GROUP],
    selectedMemberIds: [],
    nameById: NAMES,
    showAllGroups: false,
    ...overrides,
  });
}

describe("buildParticipantChoices の候補表示", () => {
  it("既定では同グループのメンバーだけを出す", () => {
    const choices = build();

    expect(choices.map((choice) => choice.memberId)).toEqual(["m1", "m2"]);
  });

  it("「他グループも表示」がオンなら候補を全件出す", () => {
    const choices = build({ showAllGroups: true });

    expect(choices.map((choice) => choice.memberId)).toEqual(["m1", "m2", "m3"]);
  });

  it("他グループでも選択済みなら、切替がオフでも表示する", () => {
    const choices = build({ selectedMemberIds: ["m3"] });

    expect(choices.map((choice) => choice.memberId)).toEqual(["m1", "m2", "m3"]);
    expect(choices.find((choice) => choice.memberId === "m3")?.isSelected).toBe(true);
  });

  it("候補の並び（期昇順→かな順の入力順）を保つ", () => {
    const choices = build({ showAllGroups: true });

    expect(choices.map((choice) => choice.generation)).toEqual(["1", "2", null]);
  });

  it("選択状態を各行へ反映する", () => {
    const choices = build({ selectedMemberIds: ["m2"] });

    expect(choices.find((choice) => choice.memberId === "m1")?.isSelected).toBe(false);
    expect(choices.find((choice) => choice.memberId === "m2")?.isSelected).toBe(true);
  });
});

// リリース紐づけ変更で候補が変わっても、選択済みを暗黙削除しない（#427 AC）。
// 一覧へ出さないと解除できず、保存境界で拒否されて詰むため必ず表示する。
describe("buildParticipantChoices の候補外既選択", () => {
  it("候補外の既選択を末尾へ isOutOfScope 付きで出す", () => {
    const choices = build({ selectedMemberIds: ["m1", "gone1"] });

    expect(choices.map((choice) => choice.memberId)).toEqual(["m1", "m2", "gone1"]);
    const outOfScope = choices.find((choice) => choice.memberId === "gone1");
    expect(outOfScope).toMatchObject({
      isSelected: true,
      isOutOfScope: true,
      memberName: "そつぎょう",
    });
  });

  it("「他グループも表示」がオフでも候補外の既選択を隠さない", () => {
    const offState = build({ selectedMemberIds: ["gone1"], showAllGroups: false });
    const onState = build({ selectedMemberIds: ["gone1"], showAllGroups: true });

    expect(offState.some((choice) => choice.memberId === "gone1")).toBe(true);
    expect(onState.some((choice) => choice.memberId === "gone1")).toBe(true);
  });

  it("候補外が複数あるときは名前順に並べる", () => {
    const choices = build({ selectedMemberIds: ["gone1", "gone2"] });

    expect(
      choices.filter((choice) => choice.isOutOfScope).map((choice) => choice.memberName)
    ).toEqual(["あるばむ", "そつぎょう"]);
  });

  it("表示名が解決できない候補外は memberId をそのまま出す", () => {
    const choices = build({ selectedMemberIds: ["unknown-id"] });

    expect(choices.find((choice) => choice.isOutOfScope)?.memberName).toBe("unknown-id");
  });

  it("候補が空でも既選択は表示する（初出リリース未確定の場合）", () => {
    const choices = build({ options: [], selectedMemberIds: ["gone1"] });

    expect(choices).toHaveLength(1);
    expect(choices[0].isOutOfScope).toBe(true);
  });
});

describe("selectedGenerationsForSummary", () => {
  it("選択済みだけを母数にする", () => {
    const choices = build({ selectedMemberIds: ["m1"], showAllGroups: true });

    expect(selectedGenerationsForSummary(choices)).toEqual(["1"]);
  });

  it("候補外の既選択も母数に含める（期不明として null）", () => {
    const choices = build({ selectedMemberIds: ["m1", "gone1"] });

    expect(selectedGenerationsForSummary(choices)).toEqual(["1", null]);
  });

  it("未選択なら空配列を返す", () => {
    expect(selectedGenerationsForSummary(build())).toEqual([]);
  });
});
