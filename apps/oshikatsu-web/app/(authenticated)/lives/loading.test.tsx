import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/(authenticated)/lives/loading";

// #486: 初回server fetch中はSuspenseがカバーできず、route全体が空白になる
// （lives/page.tsxはh1描画前にgetLivesPageDataをawaitする）。loading.tsxが
// h1込みで主要領域のplaceholderを示すことと、AT向けのstatus contractを回帰させる。
describe("app/(authenticated)/lives/loading.tsx", () => {
  it("page titleのh1を持つ", () => {
    render(<Loading />);

    expect(screen.getByRole("heading", { name: "ライブ" })).toBeInTheDocument();
  });

  it("可視の読み込み中textをrole=statusとaria-busy=trueで公開する", () => {
    render(<Loading />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAccessibleName("読み込み中");
    expect(status).toBeVisible();
  });

  it("filter row / card gridのplaceholderはaria-hiddenで二重読み上げを避ける", () => {
    const { container } = render(<Loading />);

    const hiddenNodes = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenNodes.length).toBeGreaterThan(0);
  });
});
