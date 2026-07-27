import { describe, expect, it } from "vitest";
import {
  assignedMemberIds,
  hasFormation,
  outOfCandidateAssignedMemberIds,
  parseMemberCount,
  removeMemberFromRows,
  toggleRowMember,
  unplacedMemberIds,
  updateRowMemberCount,
} from "@/lib/formationRows";

function row(memberCount: string, memberIds: string[] = []) {
  return { memberCount, memberIds };
}

describe("parseMemberCount", () => {
  it("非負整数はそのまま返す", () => {
    expect(parseMemberCount("0")).toBe(0);
    expect(parseMemberCount("3")).toBe(3);
  });

  it("空文字・非数値・負数・小数は0にする", () => {
    expect(parseMemberCount("")).toBe(0);
    expect(parseMemberCount("abc")).toBe(0);
    expect(parseMemberCount("-1")).toBe(0);
    expect(parseMemberCount("1.5")).toBe(0);
  });
});

describe("updateRowMemberCount", () => {
  it("列人数を増やしても割当は変わらない", () => {
    const next = updateRowMemberCount(row("2", ["a", "b"]), "4");

    expect(next.memberCount).toBe("4");
    expect(next.memberIds).toEqual(["a", "b"]);
  });

  it("列人数を減らすと超過分を末尾から落とす", () => {
    const next = updateRowMemberCount(row("3", ["a", "b", "c"]), "1");

    expect(next.memberIds).toEqual(["a"]);
  });

  it("0にすると割当を空にする", () => {
    expect(updateRowMemberCount(row("2", ["a", "b"]), "0").memberIds).toEqual([]);
  });

  it("入力文字列はそのまま保持する（検証は保存境界）", () => {
    expect(updateRowMemberCount(row("1", []), "").memberCount).toBe("");
  });

  it("元の行を変更しない", () => {
    const original = row("3", ["a", "b", "c"]);
    updateRowMemberCount(original, "1");

    expect(original.memberIds).toEqual(["a", "b", "c"]);
  });
});

describe("toggleRowMember", () => {
  it("未割当なら末尾へ追加する", () => {
    expect(toggleRowMember(row("2", ["a"]), "b").memberIds).toEqual(["a", "b"]);
  });

  it("列人数に達していれば追加しない", () => {
    const target = row("1", ["a"]);

    expect(toggleRowMember(target, "b")).toBe(target);
  });

  it("割当済みなら外す", () => {
    expect(toggleRowMember(row("2", ["a", "b"]), "a").memberIds).toEqual(["b"]);
  });

  it("列人数を超えていても、外す操作は妨げない", () => {
    expect(toggleRowMember(row("0", ["a"]), "a").memberIds).toEqual([]);
  });
});

describe("removeMemberFromRows", () => {
  it("全列から対象メンバーを外す", () => {
    const rows = [row("2", ["a", "b"]), row("2", ["a", "c"])];

    expect(removeMemberFromRows(rows, "a").map((r) => r.memberIds)).toEqual([
      ["b"],
      ["c"],
    ]);
  });

  it("居ないメンバーを指定しても他を壊さない", () => {
    const rows = [row("1", ["a"])];

    expect(removeMemberFromRows(rows, "z").map((r) => r.memberIds)).toEqual([["a"]]);
  });
});

describe("assignedMemberIds", () => {
  it("列順→列内順で重複を排除する", () => {
    const rows = [row("2", ["b", "a"]), row("2", ["a", "c"])];

    expect(assignedMemberIds(rows)).toEqual(["b", "a", "c"]);
  });

  it("列が無ければ空", () => {
    expect(assignedMemberIds([])).toEqual([]);
  });
});

describe("unplacedMemberIds", () => {
  it("未配置の候補を候補の並び順で返す", () => {
    const rows = [row("1", ["b"])];

    expect(unplacedMemberIds(rows, ["a", "b", "c"])).toEqual(["a", "c"]);
  });

  it("全員配置済みなら空", () => {
    expect(unplacedMemberIds([row("2", ["a", "b"])], ["a", "b"])).toEqual([]);
  });

  it("列が無ければ候補全員が未配置", () => {
    expect(unplacedMemberIds([], ["a", "b"])).toEqual(["a", "b"]);
  });
});

// コピーや既存データで、候補メンバー外が列へ残ることがある。
// 一覧へ出して解除できるようにするための抽出（#423）。
describe("outOfCandidateAssignedMemberIds", () => {
  it("候補外の配置だけを返す", () => {
    const rows = [row("2", ["a", "gone"])];

    expect(outOfCandidateAssignedMemberIds(rows, ["a", "b"])).toEqual(["gone"]);
  });

  it("候補が空ならすべて候補外になる", () => {
    expect(outOfCandidateAssignedMemberIds([row("1", ["a"])], [])).toEqual(["a"]);
  });

  it("候補外が無ければ空", () => {
    expect(outOfCandidateAssignedMemberIds([row("1", ["a"])], ["a"])).toEqual([]);
  });

  it("複数列に跨る候補外を重複なく返す", () => {
    const rows = [row("1", ["gone"]), row("1", ["gone"])];

    expect(outOfCandidateAssignedMemberIds(rows, [])).toEqual(["gone"]);
  });
});

describe("hasFormation", () => {
  it("列が1つでもあれば登録扱い", () => {
    expect(hasFormation([row("0", [])])).toBe(true);
  });

  it("列が無ければ未登録", () => {
    expect(hasFormation([])).toBe(false);
  });
});
