import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListBackButton } from "@/components/ui/ListBackButton";
import {
  consumeListBackNavigation,
  hasListBackNavigation,
} from "@/components/ui/listBackNavigation";

// listBackNavigation自体の判定ロジック（marker無し/期限切れ/不一致）は
// listBackNavigation.ts側の責務。ここではListBackButtonがtrue/falseの結果を
// 受けてrouter.back() / router.push()のどちらを呼ぶかだけを検証する。
vi.mock("@/components/ui/listBackNavigation", () => ({
  consumeListBackNavigation: vi.fn(),
  hasListBackNavigation: vi.fn(),
}));

const routerBack = vi.fn();
const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: routerBack,
    push: routerPush,
  }),
}));

const startProgress = vi.fn();

vi.mock("@/components/ui/NavigationProgress", () => ({
  useNavigationProgress: () => ({
    isProgressActive: false,
    startProgress,
    stopProgress: vi.fn(),
  }),
}));

const FALLBACK_HREF = "/songs";

beforeEach(() => {
  routerBack.mockClear();
  routerPush.mockClear();
  startProgress.mockClear();
  vi.mocked(consumeListBackNavigation).mockReset();
  vi.mocked(hasListBackNavigation).mockReset();
});

describe("ListBackButton のクリック時の遷移先", () => {
  it("登録済みlist navigationがある場合はrouter.back()を呼ぶ", async () => {
    vi.mocked(hasListBackNavigation).mockReturnValue(true);
    vi.mocked(consumeListBackNavigation).mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <ListBackButton fallbackHref={FALLBACK_HREF}>← 一覧へ戻る</ListBackButton>
    );

    await user.click(screen.getByRole("button", { name: "← 一覧へ戻る" }));

    expect(hasListBackNavigation).toHaveBeenCalledOnce();
    expect(consumeListBackNavigation).toHaveBeenCalledOnce();
    expect(routerBack).toHaveBeenCalledOnce();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("登録済みlist navigationが無い場合はstartProgressとrouter.push(fallbackHref)を呼ぶ", async () => {
    // marker無し・期限切れ・不一致のいずれもhasListBackNavigationはfalseを返す。
    // ListBackButton側の分岐は理由を問わずfalseの1ケースを見れば足りる。
    vi.mocked(hasListBackNavigation).mockReturnValue(false);
    const user = userEvent.setup();

    render(
      <ListBackButton fallbackHref={FALLBACK_HREF}>← 一覧へ戻る</ListBackButton>
    );

    await user.click(screen.getByRole("button", { name: "← 一覧へ戻る" }));

    expect(consumeListBackNavigation).toHaveBeenCalledOnce();
    expect(startProgress).toHaveBeenCalledOnce();
    expect(routerPush).toHaveBeenCalledExactlyOnceWith(FALLBACK_HREF);
    expect(routerBack).not.toHaveBeenCalled();
  });

  it("mount後にmarkerが無効になった場合はfallbackへ安全に遷移する", async () => {
    vi.mocked(hasListBackNavigation).mockReturnValue(true);
    vi.mocked(consumeListBackNavigation).mockReturnValue(false);
    const user = userEvent.setup();

    render(
      <ListBackButton fallbackHref={FALLBACK_HREF}>← 一覧へ戻る</ListBackButton>
    );

    await user.click(screen.getByRole("button", { name: "← 一覧へ戻る" }));

    expect(consumeListBackNavigation).toHaveBeenCalledOnce();
    expect(startProgress).toHaveBeenCalledOnce();
    expect(routerPush).toHaveBeenCalledExactlyOnceWith(FALLBACK_HREF);
    expect(routerBack).not.toHaveBeenCalled();
  });
});

describe("ListBackButton のclassName", () => {
  it("focus ring classと44px hit area classを含む", () => {
    vi.mocked(hasListBackNavigation).mockReturnValue(false);

    render(
      <ListBackButton fallbackHref={FALLBACK_HREF}>← 一覧へ戻る</ListBackButton>
    );

    const button = screen.getByRole("button", { name: "← 一覧へ戻る" });
    expect(button.className).toContain("focus-visible:outline-focus-ring");
    expect(button.className).toContain("min-h-11");
  });

  it("呼び出し側から渡したclassNameもマージされる", () => {
    vi.mocked(hasListBackNavigation).mockReturnValue(false);

    render(
      <ListBackButton
        fallbackHref={FALLBACK_HREF}
        className="text-sm text-foreground-secondary"
      >
        ← 一覧へ戻る
      </ListBackButton>
    );

    const button = screen.getByRole("button", { name: "← 一覧へ戻る" });
    expect(button.className).toContain("text-sm");
    expect(button.className).toContain("text-foreground-secondary");
    expect(button.className).toContain("min-h-11");
  });
});
