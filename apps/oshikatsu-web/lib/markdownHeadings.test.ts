import { describe, expect, it } from "vitest";
import { extractHeadings } from "@/lib/markdownHeadings";

describe("extractHeadings", () => {
  it("見出しテキストからidをスラッグとして導出する", () => {
    const headings = extractHeadings("## Getting Started\n\n### 使い方");

    expect(headings).toEqual([
      { level: 2, text: "Getting Started", id: "getting-started" },
      { level: 3, text: "使い方", id: "使い方" },
    ]);
  });

  it("同名見出しが複数ある場合、2件目以降のidに連番を付与する", () => {
    const headings = extractHeadings("## 概要\n\n## 概要\n\n## 概要");

    expect(headings.map((heading) => heading.id)).toEqual(["概要", "概要-2", "概要-3"]);
  });

  it("コードフェンス内の見出しは抽出対象から除外する", () => {
    const markdown = [
      "## 本物の見出し",
      "",
      "```",
      "## フェンス内の見出し",
      "```",
      "",
      "### 別の本物の見出し",
    ].join("\n");

    const headings = extractHeadings(markdown);

    expect(headings.map((heading) => heading.text)).toEqual(["本物の見出し", "別の本物の見出し"]);
  });
});
