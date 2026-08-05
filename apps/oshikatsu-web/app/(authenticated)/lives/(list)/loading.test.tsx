import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/(authenticated)/lives/(list)/loading";

// #486: 初回server fetch中はSuspenseがカバーできず、route全体が空白になる
// （lives/page.tsxはh1描画前にgetLivesPageDataをawaitする）。loading.tsxが
// h1込みで主要領域のplaceholderを示すことと、AT向けのstatus contractを回帰させる。
describe("app/(authenticated)/lives/(list)/loading.tsx", () => {
  it("page titleのh1を持つ", () => {
    render(<Loading />);

    expect(screen.getByRole("heading", { name: "ライブ" })).toBeInTheDocument();
  });

  it("可視の読み込み中textをrole=statusで公開する", () => {
    render(<Loading />);

    const status = screen.getByRole("status");
    expect(status).toHaveAccessibleName("読み込み中");
    expect(status).toBeVisible();
  });

  // #487 P1: aria-busy="true"をstatus自身に付けると、trueのままcomponentごと
  // unmountされ通知が抑止されうる。statusはbusy subtreeの外、aria-busyは
  // 別要素（読み込み対象のcollection領域）に付いていることを確認する。
  it("role=statusの要素はaria-busyを持たず、aria-busy=trueの別要素の中にstatusは含まれない", () => {
    const { container } = render(<Loading />);

    const status = screen.getByRole("status");
    expect(status).not.toHaveAttribute("aria-busy");

    const busyRegion = container.querySelector('[aria-busy="true"]');
    expect(busyRegion).not.toBeNull();
    expect(within(busyRegion as HTMLElement).queryByRole("status")).not.toBeInTheDocument();
  });

  it("filter row / card gridのplaceholderはaria-hiddenで二重読み上げを避ける", () => {
    const { container } = render(<Loading />);

    const hiddenNodes = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenNodes.length).toBeGreaterThan(0);
  });
});
