import { describe, expect, it } from "vitest";
import { formatGroupNames } from "@/lib/formatters";

describe("formatGroupNames", () => {
  it("複数のgroup名を日本語の読点で連結する（#395）", () => {
    expect(formatGroupNames(["乃木坂46", "櫻坂46"])).toBe("乃木坂46、櫻坂46");
  });

  it("単一のgroup名はそのまま返す", () => {
    expect(formatGroupNames(["日向坂46"])).toBe("日向坂46");
  });

  it("空配列は空文字を返す", () => {
    expect(formatGroupNames([])).toBe("");
  });
});
