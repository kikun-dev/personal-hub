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
