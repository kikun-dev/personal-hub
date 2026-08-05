import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemberSongsSection } from "@/components/members/MemberSongsSection";
import type { Song } from "@/types/song";

// PendingLinkが内部でnext/linkを使うため、SetlistEditor.test.tsxと同じ方針で
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

function createSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "song-1",
    title: "テスト楽曲",
    groupId: "group-1",
    groupNameJa: "テストグループ",
    groupColor: "#000000",
    label: null,
    generation: null,
    releaseDate: null,
    representativeReleaseType: null,
    representativeNumbering: null,
    releases: [],
    credits: [],
    participants: [],
    formationRows: [],
    mv: null,
    videos: [],
    costumes: [],
    artistName: null,
    note: null,
    ...overrides,
  };
}

describe("MemberSongsSection のトグル", () => {
  it("初期状態ではaria-expandedがfalseで、対象regionはDOMに存在する", () => {
    render(
      <MemberSongsSection songs={[createSong()]} centerTrackIds={[]} />
    );

    const toggle = screen.getByRole("button", { name: "全曲を表示 ▼" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    const regionId = toggle.getAttribute("aria-controls");
    expect(regionId).not.toBeNull();
    expect(document.getElementById(regionId ?? "")).not.toBeNull();
  });

  it("クリック後にaria-expandedがtrueになり、aria-controlsの対象と一致するregionへ楽曲リンクが表示される", async () => {
    const user = userEvent.setup();
    render(
      <MemberSongsSection
        songs={[createSong({ id: "song-1", title: "テスト楽曲" })]}
        centerTrackIds={[]}
      />
    );

    const toggle = screen.getByRole("button", { name: "全曲を表示 ▼" });
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "閉じる ▲" })).toBe(toggle);

    const regionId = toggle.getAttribute("aria-controls");
    const region = document.getElementById(regionId ?? "");
    expect(region).not.toBeNull();

    const songLink = screen.getByRole("link", { name: /テスト楽曲/ });
    expect(region).toContainElement(songLink);
  });
});

// #484: センター文字のraw palette(text-amber-600)をsemantic token(text-center-text)へ
// 置換したことの回帰固定テスト。
describe("MemberSongsSection のセンター表示 (#484)", () => {
  it("センター曲がある場合、★ センター N曲がtext-center-textを持ちtext-amber-を持たない", () => {
    render(
      <MemberSongsSection
        songs={[
          createSong({ id: "song-1" }),
          createSong({ id: "song-2" }),
        ]}
        centerTrackIds={["song-1"]}
      />
    );

    const centerCountText = screen.getByText("★ センター 1曲");
    expect(centerCountText.className).toContain("text-center-text");
    expect(centerCountText.className).not.toMatch(/text-amber-/);
  });

  it("展開後、センター曲の★はtext-center-textを持ち、非センター曲には★が付かない", async () => {
    const user = userEvent.setup();
    render(
      <MemberSongsSection
        songs={[
          createSong({ id: "song-1", title: "センター曲" }),
          createSong({ id: "song-2", title: "通常曲" }),
        ]}
        centerTrackIds={["song-1"]}
      />
    );

    await user.click(screen.getByRole("button", { name: "全曲を表示 ▼" }));

    const centerStar = screen.getByText("★");
    expect(centerStar.className).toContain("text-center-text");
    expect(centerStar.className).not.toMatch(/text-amber-/);

    const centerSongLink = screen.getByRole("link", { name: /センター曲/ });
    const normalSongLink = screen.getByRole("link", { name: /通常曲/ });
    expect(centerSongLink).toContainElement(centerStar);
    expect(normalSongLink.textContent).not.toContain("★");
  });
});
