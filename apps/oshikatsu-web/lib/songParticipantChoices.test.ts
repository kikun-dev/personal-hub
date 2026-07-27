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

// 楽曲グループでの所属期。候補内・候補外で同じ供給源を使う（#427 レビューP2）。
const GENERATIONS = new Map<string, string | null>([
  ["m1", "1"],
  ["m2", "2"],
  ["m3", null],
  ["gone1", "3"],
  ["gone2", null],
]);

function build(overrides: Partial<Parameters<typeof buildParticipantChoices>[0]> = {}) {
  return buildParticipantChoices({
    options: [IN_GROUP_1, IN_GROUP_2, OTHER_GROUP],
    selectedMemberIds: [],
    nameById: NAMES,
    generationById: GENERATIONS,
    ...overrides,
  });
}

describe("buildParticipantChoices の候補表示", () => {
  // 候補は初出リリースの参加メンバーだけで小さいため、表示範囲の切替は持たない
  it("候補を常に全件出す（楽曲グループ外も含む）", () => {
    const choices = build();

    expect(choices.map((choice) => choice.memberId)).toEqual(["m1", "m2", "m3"]);
  });

  it("楽曲グループ外の行を isInSongGroup で区別できる", () => {
    const choices = build();

    expect(choices.find((choice) => choice.memberId === "m3")?.isInSongGroup).toBe(false);
    expect(choices.find((choice) => choice.memberId === "m1")?.isInSongGroup).toBe(true);
  });

  it("候補の並び（期昇順→かな順の入力順）を保つ", () => {
    const choices = build();

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

    expect(choices.map((choice) => choice.memberId)).toEqual(["m1", "m2", "m3", "gone1"]);
    const outOfScope = choices.find((choice) => choice.memberId === "gone1");
    expect(outOfScope).toMatchObject({
      isSelected: true,
      isOutOfScope: true,
      memberName: "そつぎょう",
    });
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
    const choices = build({ selectedMemberIds: ["m1"] });

    expect(selectedGenerationsForSummary(choices)).toEqual(["1"]);
  });

  it("候補外の既選択も母数に含め、期も解決する", () => {
    const choices = build({ selectedMemberIds: ["m1", "gone1"] });

    expect(selectedGenerationsForSummary(choices)).toEqual(["1", "3"]);
  });

  it("期が解決できない候補外は null（他N人）として扱う", () => {
    const choices = build({ selectedMemberIds: ["unknown-id"] });

    expect(selectedGenerationsForSummary(choices)).toEqual([null]);
  });

  it("未選択なら空配列を返す", () => {
    expect(selectedGenerationsForSummary(build())).toEqual([]);
  });
});
