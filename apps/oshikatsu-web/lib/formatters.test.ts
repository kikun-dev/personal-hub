import { describe, expect, it } from "vitest";
import {
  formatGroupNames,
  formatVideoLinkAccessibleName,
} from "@/lib/formatters";

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

describe("formatVideoLinkAccessibleName", () => {
  it("曲名・種別を保持し、新しいタブで開く旨を含む（#395）", () => {
    expect(formatVideoLinkAccessibleName("Same numbers", "MV")).toBe(
      "Same numbers（MV）（新しいタブで開く）"
    );
  });

  it("曲名と動画種別の両方をaccessible nameに保持する", () => {
    const name = formatVideoLinkAccessibleName(
      "好きというのはロックだぜ！",
      "予告編"
    );
    expect(name).toContain("好きというのはロックだぜ！");
    expect(name).toContain("予告編");
    expect(name).toContain("新しいタブで開く");
  });
});
