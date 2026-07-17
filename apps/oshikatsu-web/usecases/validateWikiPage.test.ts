import { describe, expect, it } from "vitest";
import type { CreateWikiPageInput } from "@/types/wiki";
import { validateWikiPage } from "@/usecases/validateWikiPage";

function makeInput(overrides: Partial<CreateWikiPageInput> = {}): CreateWikiPageInput {
  return {
    slug: "getting-started",
    title: "はじめに",
    bodyMarkdown: "# 見出し\n\n本文",
    sortOrder: "",
    ...overrides,
  };
}

describe("validateWikiPage", () => {
  it("スラッグ・タイトルが未入力の場合、ValidationErrorを返す", () => {
    const errors = validateWikiPage(makeInput({ slug: "", title: "" }));

    expect(errors).toEqual(
      expect.arrayContaining([
        { field: "slug", message: "スラッグを入力してください" },
        { field: "title", message: "タイトルを入力してください" },
      ])
    );
  });

  it("スラッグが英小文字・数字・ハイフン以外を含む場合、ValidationErrorを返す", () => {
    const errors = validateWikiPage(makeInput({ slug: "Invalid_Slug" }));

    expect(errors).toContainEqual({
      field: "slug",
      message: "スラッグは英小文字・数字・ハイフンのみで入力してください",
    });
  });

  it("表示順が整数でない場合、ValidationErrorを返す", () => {
    const errors = validateWikiPage(makeInput({ sortOrder: "1.5" }));

    expect(errors).toContainEqual({ field: "sortOrder", message: "表示順は整数で入力してください" });
  });

  it("正常な入力の場合、ValidationErrorは空配列になる", () => {
    const errors = validateWikiPage(makeInput());

    expect(errors).toEqual([]);
  });
});
