import { describe, expect, it } from "vitest";
import { pickFirstDatedRelease, pickFirstReleaseId } from "@/lib/firstRelease";

describe("pickFirstDatedRelease", () => {
  it("紐づきが無ければ未確定（null）を返す", () => {
    expect(pickFirstDatedRelease([])).toBeNull();
  });

  it("単一の日付付きリリースをそのまま返す", () => {
    const releases = [{ releaseId: "r1", releaseDate: "2024-05-01" }];

    expect(pickFirstDatedRelease(releases)?.releaseId).toBe("r1");
  });

  it("最も古いリリース日を選ぶ", () => {
    const releases = [
      { releaseId: "album", releaseDate: "2025-03-01" },
      { releaseId: "single", releaseDate: "2024-05-01" },
      { releaseId: "best", releaseDate: "2026-01-01" },
    ];

    expect(pickFirstDatedRelease(releases)?.releaseId).toBe("single");
  });

  it("同日が複数ある場合は releaseId の昇順で決定的に選ぶ", () => {
    const ascending = [
      { releaseId: "b", releaseDate: "2024-05-01" },
      { releaseId: "a", releaseDate: "2024-05-01" },
    ];
    const descending = [
      { releaseId: "a", releaseDate: "2024-05-01" },
      { releaseId: "b", releaseDate: "2024-05-01" },
    ];

    expect(pickFirstDatedRelease(ascending)?.releaseId).toBe("a");
    expect(pickFirstDatedRelease(descending)?.releaseId).toBe("a");
  });

  it("日付なしのリリースは候補から除外する", () => {
    const releases = [
      { releaseId: "undated", releaseDate: null },
      { releaseId: "single", releaseDate: "2024-05-01" },
    ];

    expect(pickFirstDatedRelease(releases)?.releaseId).toBe("single");
  });

  it("すべて日付なしなら未確定（null）を返す", () => {
    const releases = [
      { releaseId: "r1", releaseDate: null },
      { releaseId: "r2", releaseDate: null },
    ];

    expect(pickFirstDatedRelease(releases)).toBeNull();
  });

  it("入力配列を変更しない", () => {
    const releases = [
      { releaseId: "album", releaseDate: "2025-03-01" },
      { releaseId: "single", releaseDate: "2024-05-01" },
    ];

    pickFirstDatedRelease(releases);

    expect(releases.map((release) => release.releaseId)).toEqual(["album", "single"]);
  });

  it("追加のプロパティを保持したまま返す", () => {
    const releases = [
      { releaseId: "single", releaseDate: "2024-05-01", memberIds: ["m1", "m2"] },
    ];

    expect(pickFirstDatedRelease(releases)?.memberIds).toEqual(["m1", "m2"]);
  });
});

describe("pickFirstReleaseId", () => {
  it("初出リリースの releaseId を返す", () => {
    const releases = [
      { releaseId: "album", releaseDate: "2025-03-01" },
      { releaseId: "single", releaseDate: "2024-05-01" },
    ];

    expect(pickFirstReleaseId(releases)).toBe("single");
  });

  it("未確定なら null を返す", () => {
    expect(pickFirstReleaseId([{ releaseId: "r1", releaseDate: null }])).toBeNull();
  });
});
