import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FormationRows,
  type FormationRowData,
} from "@/components/ui/FormationRows";

function buildRows(): FormationRowData[] {
  return [
    {
      rowNumber: 1,
      members: [
        { memberId: "m1", memberNameJa: "一列目メンバー", isCenter: false },
      ],
    },
    {
      rowNumber: 2,
      members: [
        { memberId: "m2", memberNameJa: "センターメンバー", isCenter: true },
        { memberId: "m3", memberNameJa: "隣のメンバー", isCenter: false },
      ],
    },
  ];
}

describe("FormationRows (#484)", () => {
  it("centerメンバーだけが★付きでtext-center-textとfont-boldを持つ", () => {
    render(<FormationRows rows={buildRows()} />);

    const centerName = screen.getByText("★センターメンバー");
    expect(centerName.className).toContain("text-center-text");
    expect(centerName.className).toContain("font-bold");
  });

  it("非centerメンバーは★を持たず、center用classも持たない", () => {
    const { container } = render(<FormationRows rows={buildRows()} />);

    // 非centerメンバーは装飾spanを持たずテキストのみで描画されるため、
    // 「・」区切りを含む隣接テキストノードごと textContent で存在確認する
    const memberSpans = Array.from(container.querySelectorAll(".shrink-0"));
    const nonCenterSpans = memberSpans.filter(
      (span) => !span.querySelector(".font-bold")
    );

    // DOM順は列番号の降順（rowNumber:2が先、rowNumber:1が後）
    expect(nonCenterSpans.map((span) => span.textContent)).toEqual([
      " ・ 隣のメンバー",
      "一列目メンバー",
    ]);
    for (const span of nonCenterSpans) {
      expect(span.textContent).not.toContain("★");
      expect(span.className).not.toContain("text-center-text");
      expect(span.innerHTML).not.toContain("font-bold");
    }
  });

  it.each([
    ["sm", "text-sm"],
    ["xs", "text-xs"],
  ] as const)(
    "size=%s では行がtext-%sクラスを持ち、center表示の契約は変わらない",
    (size, expectedTextClass) => {
      const { container } = render(
        <FormationRows rows={buildRows()} size={size} />
      );

      const rowDivs = container.querySelectorAll(".justify-center");
      expect(rowDivs.length).toBeGreaterThan(0);
      for (const rowDiv of rowDivs) {
        expect(rowDiv.className).toContain(expectedTextClass);
      }

      const centerName = screen.getByText("★センターメンバー");
      expect(centerName.className).toContain("text-center-text");
      expect(centerName.className).toContain("font-bold");
    }
  );

  it("列番号の降順で描画される（1列目が最下段＝DOM上は最後）", () => {
    const { container } = render(<FormationRows rows={buildRows()} />);

    const rowDivs = Array.from(container.querySelectorAll(".justify-center"));
    // rowNumber: [1, 2] を渡しているが、2（最終列=最上段）が先、1（最前列=最下段）が
    // 後にDOM上へ並ぶ既存の降順ソート挙動を確認する
    expect(rowDivs[0].textContent).toContain("センターメンバー");
    expect(rowDivs[1].textContent).toContain("一列目メンバー");
  });

  it("text-amber-を含むclassが存在しない", () => {
    const { container } = render(<FormationRows rows={buildRows()} />);

    expect(container.innerHTML).not.toMatch(/text-amber-/);
  });
});
