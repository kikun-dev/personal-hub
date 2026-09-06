import { Suspense, use, useState, type ComponentProps, type ReactNode } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SongDetailError from "@/app/(authenticated)/songs/[id]/error";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

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

  it("retry buttonがRSC refreshとboundary resetを開始する", async () => {
    refresh.mockReset();
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<SongDetailError error={createError()} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "再試行" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("再取得中はbusy/disabledになり、完了後は再試行できる", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const request = new Promise<void>((resolve) => { finish = resolve; });

    function ReadResult({ pending }: { pending: Promise<void> | null }) {
      if (pending) use(pending);
      return <span>read result</span>;
    }
    function Harness() {
      const [pending, setPending] = useState<Promise<void> | null>(null);
      // Mock only the router I/O boundary. The component's useTransition and
      // React's suspension/pending lifecycle remain real.
      refresh.mockImplementation(() => { setPending(request); });
      return <>
        <SongDetailError error={createError()} reset={reset} />
        <Suspense fallback={<span>waiting</span>}><ReadResult pending={pending} /></Suspense>
      </>;
    }

    refresh.mockReset();
    render(<Harness />);
    const retry = screen.getByRole("button", { name: "再試行" });
    expect(retry).toHaveClass("min-h-11");
    await act(async () => { await user.click(retry); });
    const busy = screen.getByRole("button", { name: "再試行中…" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    await user.click(busy);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);

    await act(async () => { finish(); await request; });
    expect(await screen.findByRole("button", { name: "再試行" })).toBeEnabled();
    expect(retry).toHaveAttribute("aria-busy", "false");
    await user.click(retry);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(reset).toHaveBeenCalledTimes(2);
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
