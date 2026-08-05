import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SongNotFound from "@/app/(authenticated)/songs/[id]/not-found";

// PendingLinkが内部でnext/linkを使うため、app/not-found.test.tsxと同じ方針で
// アンカーへ差し替える（実ナビゲーションはPlaywright側の責務）。
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string | { pathname?: string };
  } & Omit<ComponentProps<"a">, "href">) => (
    <a href={typeof href === "string" ? href : (href.pathname ?? "#")} {...props}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

// #486 Decision 6: notFound()は通常のページ状態として扱い、error.tsxと違い
// role="alert"は機械的には付けない。
describe("app/(authenticated)/songs/[id]/not-found.tsx", () => {
  it("ページを理解できるh1がちょうど1つ存在する", () => {
    render(<SongNotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "楽曲が見つかりません" })
    ).toBeInTheDocument();
  });

  it("説明文が存在する", () => {
    render(<SongNotFound />);

    expect(
      screen.getByText("指定された楽曲は存在しないか、削除された可能性があります。")
    ).toBeInTheDocument();
  });

  it("recovery linkのhrefが楽曲一覧を指す", () => {
    render(<SongNotFound />);

    expect(screen.getByRole("link", { name: "← 楽曲一覧" })).toHaveAttribute(
      "href",
      "/songs"
    );
  });

  it("role=alertを持たない", () => {
    render(<SongNotFound />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
