import type { ComponentProps, ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SongDetailError from "@/app/(authenticated)/songs/[id]/error";

// PendingLinkが内部でnext/linkを使うため、not-found.test.tsxと同じ方針で
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

// #486 Decision 5: 楽曲詳細の error boundary はページ見出しと alert semantics を持ち、
// retry / recovery は alert の外に置く（interactive controls を alert 内へ入れない）。
describe("app/(authenticated)/songs/[id]/error.tsx", () => {
  function createError(): Error & { digest?: string } {
    const error = new Error("INTERNAL_DB_DETAIL: connection refused at 10.0.0.1") as Error & {
      digest?: string;
    };
    error.digest = "digest-song-1";
    return error;
  }

  it("ページを理解できるh1がちょうど1つ存在する", () => {
    render(<SongDetailError error={createError()} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "楽曲を表示できません" })
    ).toBeInTheDocument();
  });

  it("error messageがrole=alertとして公開され、retry/recoveryはalertの外にある", () => {
    render(<SongDetailError error={createError()} reset={vi.fn()} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("楽曲情報の読み込みに失敗しました。");

    // retry button / recovery link は alert 内に入っていないこと
    expect(within(alert).queryByRole("button")).toBeNull();
    expect(within(alert).queryByRole("link")).toBeNull();

    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← 楽曲一覧" })).toBeInTheDocument();
  });

  it("retry buttonのクリックでresetが呼ばれる", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<SongDetailError error={createError()} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "再試行" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("recovery linkのhrefが楽曲一覧を指す", () => {
    render(<SongDetailError error={createError()} reset={vi.fn()} />);

    expect(screen.getByRole("link", { name: "← 楽曲一覧" })).toHaveAttribute(
      "href",
      "/songs"
    );
  });

  it("error.digest以外の内部error内容（messageやstack）を描画しない", () => {
    render(<SongDetailError error={createError()} reset={vi.fn()} />);

    expect(screen.queryByText(/INTERNAL_DB_DETAIL/)).toBeNull();
    expect(document.body.textContent).not.toContain("INTERNAL_DB_DETAIL");
  });
});
