import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";

// PendingLinkが内部でnext/linkを使うため、MemberSongsSection.test.tsxと同じ方針で
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

// この404はroot layout直下で、NavigationProgressProviderを持つ(authenticated)
// layoutの外側にある。Provider外ではuseNavigationProgressがno-op fallbackを返すため、
// feedback="global"にすると global barもinline stateも出ず、pending feedbackが
// 一切表示されない。その状態へ戻さないための回帰テスト（#482 レビュー指摘）。
describe("app/not-found.tsx", () => {
  it("NavigationProgressProviderの外でもrecovery linkがpending feedbackを出す", async () => {
    // 遷移先("/")と現在URLが同一だとPendingLinkはfeedback対象外と判定するため、
    // 未定義ルートを踏んだ状態を再現する。
    window.history.replaceState({}, "", "/does-not-exist");

    const user = userEvent.setup();
    render(<NotFound />);

    // #486 Decision 6: notFound()は通常のページ状態として扱い、headingで理解可能にする。
    expect(
      screen.getByRole("heading", { level: 1, name: "ページが見つかりません" })
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "← トップへ戻る" });
    expect(link).toHaveAttribute("aria-busy", "false");

    await user.click(link);

    expect(link).toHaveAttribute("aria-busy", "true");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("status")).toHaveAccessibleName("読み込み中");
  });
});
