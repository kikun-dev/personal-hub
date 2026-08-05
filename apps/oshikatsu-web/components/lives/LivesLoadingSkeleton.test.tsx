import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LivesLoadingSkeleton } from "@/components/lives/LivesLoadingSkeleton";

// #486: app/(authenticated)/lives/page.tsxはasync Server Componentのためjsdomから
// 直接renderできない。SuspenseのfallbackにはこのcomponentをそのままJSXで渡している
// ため、ここを直接テストすることでpage.tsx側のfallbackが空要素だけではないことを
// 検証する（h1を含まないのはpage.tsx側で既に描画済みのため、意図した差分）。
describe("components/lives/LivesLoadingSkeleton.tsx", () => {
  it("filter rowとcard gridのplaceholderを持ち、空要素だけではない", () => {
    const { container } = render(<LivesLoadingSkeleton />);

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    // 実gridはsm(2列)/lg(3列)双方で最低1行を満たす最小公倍数として6件表示する
    expect(container.querySelectorAll(".grid > div").length).toBe(6);
  });

  it("h1は持たない（page.tsx側で描画済みのため二重にしない）", () => {
    render(<LivesLoadingSkeleton />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("可視の読み込み中textをrole=statusとaria-busy=trueで公開する", () => {
    render(<LivesLoadingSkeleton />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAccessibleName("読み込み中");
  });
});
