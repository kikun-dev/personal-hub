import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SetlistNotFound from "@/app/(authenticated)/lives/[id]/performances/[performanceId]/setlist/not-found";

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

const { useParamsMock } = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
}));

// #486 Decision 6: notFound()は通常のページ状態として扱い、error.tsxと違い
// role="alert"は機械的には付けない。親Liveへのリンクはid（URLセグメントの生値）が
// UUID形式で検証できた場合のみ出し、検証を通らない値ではライブ一覧のみへfallbackする。
describe("app/(authenticated)/lives/[id]/performances/[performanceId]/setlist/not-found.tsx", () => {
  afterEach(() => {
    useParamsMock.mockReset();
  });

  it("ページを理解できるh1がちょうど1つ存在する", () => {
    useParamsMock.mockReturnValue({
      id: "11111111-1111-1111-1111-111111111111",
      performanceId: "22222222-2222-2222-2222-222222222222",
    });

    render(<SetlistNotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "セットリストが見つかりません" })
    ).toBeInTheDocument();
  });

  it("説明文が存在する", () => {
    useParamsMock.mockReturnValue({
      id: "11111111-1111-1111-1111-111111111111",
      performanceId: "22222222-2222-2222-2222-222222222222",
    });

    render(<SetlistNotFound />);

    expect(
      screen.getByText(
        "指定されたセットリストは存在しないか、削除された可能性があります。"
      )
    ).toBeInTheDocument();
  });

  it("role=alertを持たない", () => {
    useParamsMock.mockReturnValue({
      id: "11111111-1111-1111-1111-111111111111",
      performanceId: "22222222-2222-2222-2222-222222222222",
    });

    render(<SetlistNotFound />);

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("idが有効なUUIDのとき、親Liveへのリンクとライブ一覧の両方が出る", () => {
    useParamsMock.mockReturnValue({
      id: "11111111-1111-1111-1111-111111111111",
      performanceId: "22222222-2222-2222-2222-222222222222",
    });

    render(<SetlistNotFound />);

    expect(screen.getByRole("link", { name: "← ライブ詳細へ戻る" })).toHaveAttribute(
      "href",
      "/lives/11111111-1111-1111-1111-111111111111"
    );
    expect(screen.getByRole("link", { name: "← ライブ一覧" })).toHaveAttribute(
      "href",
      "/lives"
    );
  });

  it.each([["../etc"], ["not-a-uuid"]])(
    "idが不正な値(%s)のとき、親Liveへのリンクが出ずライブ一覧のみになる",
    (invalidId) => {
      useParamsMock.mockReturnValue({
        id: invalidId,
        performanceId: "22222222-2222-2222-2222-222222222222",
      });

      render(<SetlistNotFound />);

      expect(screen.queryByRole("link", { name: "← ライブ詳細へ戻る" })).toBeNull();
      expect(screen.getByRole("link", { name: "← ライブ一覧" })).toHaveAttribute(
        "href",
        "/lives"
      );
    }
  );
});
