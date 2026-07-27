import { describe, expect, it } from "vitest";
import { withGeneratedKey, withInitialKey } from "@/lib/keyedList";

// #443: 初期表示のキーは SSR と client hydration で同一である必要がある。
// 生成が非決定的だと _key から作る id / htmlFor が hydration mismatch になる。
describe("withInitialKey", () => {
  it("同じ入力から常に同じキーを返す", () => {
    const first = withInitialKey({ value: "a" }, 0, "release");
    const second = withInitialKey({ value: "a" }, 0, "release");

    expect(first._key).toBe(second._key);
  });

  it("インデックスごとに異なるキーになる", () => {
    const keys = [{}, {}, {}].map((item, index) =>
      withInitialKey(item, index, "release")._key
    );

    expect(new Set(keys).size).toBe(3);
  });

  it("scope が違えば同じインデックスでも衝突しない", () => {
    expect(withInitialKey({}, 0, "release")._key).not.toBe(
      withInitialKey({}, 0, "formation")._key
    );
  });

  it("元のプロパティを保持する", () => {
    expect(withInitialKey({ releaseId: "r1" }, 0, "release")).toMatchObject({
      releaseId: "r1",
    });
  });

  it("元のオブジェクトを変更しない", () => {
    const item = { value: "a" };
    withInitialKey(item, 0, "release");

    expect(item).not.toHaveProperty("_key");
  });

  // 追加行はランダム、初期行は決定的。両者が混在しても衝突しない。
  it("withGeneratedKey が返すキーと衝突しない", () => {
    const initial = withInitialKey({}, 0, "release")._key;
    const added = withGeneratedKey({})._key;

    expect(initial).not.toBe(added);
    expect(initial.startsWith("initial-")).toBe(true);
    expect(added.startsWith("initial-")).toBe(false);
  });
});
