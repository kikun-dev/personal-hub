import { describe, expect, it } from "vitest";
import {
  MAX_CENTERS,
  isCenterAdditionBlocked,
  toggleCenterSelection,
} from "@/lib/centerSelection";

describe("toggleCenterSelection", () => {
  it("未選択なら追加する", () => {
    expect(toggleCenterSelection([], "a")).toEqual(["a"]);
    expect(toggleCenterSelection(["a"], "b")).toEqual(["a", "b"]);
  });

  it("選択済みなら解除する", () => {
    expect(toggleCenterSelection(["a", "b"], "a")).toEqual(["b"]);
  });

  it("上限に達していれば追加しない", () => {
    const current = ["a", "b"];

    expect(toggleCenterSelection(current, "c")).toBe(current);
  });

  it("上限に達していても解除はできる", () => {
    expect(toggleCenterSelection(["a", "b"], "b")).toEqual(["a"]);
  });

  // 既存データが上限を超えている場合でも、解除して正常な状態へ戻せる必要がある
  it("上限を超えた状態からも1人ずつ解除できる", () => {
    expect(toggleCenterSelection(["a", "b", "c"], "c")).toEqual(["a", "b"]);
  });

  it("元の配列を変更しない", () => {
    const current = ["a"];
    toggleCenterSelection(current, "b");

    expect(current).toEqual(["a"]);
  });

  it("上限は引数で変えられる", () => {
    expect(toggleCenterSelection(["a"], "b", 1)).toEqual(["a"]);
  });
});

describe("isCenterAdditionBlocked", () => {
  it("上限未満なら追加できる", () => {
    expect(isCenterAdditionBlocked([], "a")).toBe(false);
    expect(isCenterAdditionBlocked(["a"], "b")).toBe(false);
  });

  it("上限に達していれば未選択メンバーの追加を止める", () => {
    expect(isCenterAdditionBlocked(["a", "b"], "c")).toBe(true);
  });

  it("選択済みメンバーは上限に関わらず操作できる", () => {
    expect(isCenterAdditionBlocked(["a", "b"], "a")).toBe(false);
  });

  it("既定の上限は2人（Wセンター）", () => {
    expect(MAX_CENTERS).toBe(2);
  });
});
