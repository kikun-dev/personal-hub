import { describe, expect, it } from "vitest";
import type { SetlistEditorItemInput } from "@/types/live";
import { validateSetlist } from "@/usecases/validateSetlist";

function makeItem(overrides: Partial<SetlistEditorItemInput> = {}): SetlistEditorItemInput {
  return {
    itemType: "song",
    trackId: "11111111-1111-1111-1111-111111111111",
    note: "",
    section: "main",
    performanceStyles: [],
    costumeNote: "",
    members: [],
    formationRows: [],
    ...overrides,
  };
}

describe("validateSetlist", () => {
  it("楽曲項目でtrackId未選択の場合、items.0にValidationErrorを返す（#422 登録曲必須）", () => {
    const errors = validateSetlist([makeItem({ trackId: "" })], []);

    expect(errors).toContainEqual({
      field: "items.0",
      message: "楽曲は登録曲の選択が必要です",
    });
  });

  it("楽曲項目でtrackIdが選択されている場合、ValidationErrorは発生しない", () => {
    const errors = validateSetlist([makeItem()], []);

    expect(errors).toEqual([]);
  });

  it("楽曲以外の項目はtrackId未選択でもValidationErrorを返さない", () => {
    const errors = validateSetlist(
      [makeItem({ itemType: "mc", trackId: "" })],
      []
    );

    expect(errors).toEqual([]);
  });
});
