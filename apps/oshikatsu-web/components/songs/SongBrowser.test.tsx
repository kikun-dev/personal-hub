import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SongBrowser } from "@/components/songs/SongBrowser";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import type { Group } from "@/types/group";
import type { SongListItem, SongSection } from "@/types/song";

// SongCardが内部でPendingLink（next/link）を使うため、
// MemberBrowser.test.tsxと同じ方針でアンカーへ差し替える。
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

// SongBrowserはURLクエリを読むだけで、このテストでは初期状態（未指定）に固定する。
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// resetアクションのURL反映（history.replaceState）を実インスタンスなしで検証するため、
// 呼び出し引数だけをvi.fnで観測する。
vi.mock("@/lib/listFilterUrl", () => ({
  replaceListFilterParams: vi.fn(),
}));

function createGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "group-a",
    nameJa: "テストグループA",
    nameEn: null,
    color: "#000000",
    maxGeneration: null,
    isActive: true,
    successorId: null,
    sortOrder: 0,
    penlightColors: [],
    isCatchall: false,
    ...overrides,
  };
}

function createSong(overrides: Partial<SongListItem> = {}): SongListItem {
  return {
    id: "song-1",
    title: "テスト楽曲",
    groupId: "group-a",
    groupNameJa: "テストグループA",
    groupColor: "#000000",
    label: "title",
    generation: null,
    isCatchall: false,
    releaseCount: 1,
    firstReleaseDate: "2020-01-01",
    representativeReleaseId: "release-1",
    representativeTrackNumber: 1,
    representativeReleaseType: "single",
    representativeNumbering: 1,
    ...overrides,
  };
}

function buildSections(songs: SongListItem[], group: Group | null): SongSection[] {
  if (songs.length === 0) return [];
  return [{ group, songs }];
}

describe("SongBrowser のEmpty分岐", () => {
  it("元データ自体が0件のとき、resource不在の文言が出てresetボタンは無い", () => {
    render(<SongBrowser groups={[]} songs={[]} songSections={[]} />);

    expect(
      screen.getByText("まだ楽曲が登録されていません")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "絞り込みを解除" })
    ).not.toBeInTheDocument();
  });

  it("filter適用で0件になったとき、no-matchの文言とresetボタンが出る", async () => {
    const groupA = createGroup();
    const songs = [createSong({ label: "title" })];
    const songSections = buildSections(songs, groupA);
    const user = userEvent.setup();
    render(<SongBrowser groups={[groupA]} songs={songs} songSections={songSections} />);

    // 表題ラベルのみのfixtureに対し「選抜」で絞り込むと0件になる
    await user.selectOptions(
      screen.getByRole("combobox", { name: "ラベルで絞り込み" }),
      "senbatsu"
    );

    expect(
      screen.getByText("条件に一致する楽曲が見つかりません")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "絞り込みを解除" })
    ).toBeInTheDocument();
  });

  it("resetを押すと表示が復帰し、filter stateが既定へ戻る", async () => {
    const groupA = createGroup();
    const songs = [createSong({ label: "title" })];
    const songSections = buildSections(songs, groupA);
    const user = userEvent.setup();
    render(<SongBrowser groups={[groupA]} songs={songs} songSections={songSections} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "ラベルで絞り込み" }),
      "senbatsu"
    );
    expect(
      screen.getByRole("button", { name: "絞り込みを解除" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "絞り込みを解除" }));

    expect(
      screen.queryByText("条件に一致する楽曲が見つかりません")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "ラベルで絞り込み" })
    ).toHaveValue("");
  });

  it("resetでreplaceListFilterParamsが既定値で呼ばれる", async () => {
    const groupA = createGroup();
    const songs = [createSong({ label: "title" })];
    const songSections = buildSections(songs, groupA);
    const user = userEvent.setup();
    render(<SongBrowser groups={[groupA]} songs={songs} songSections={songSections} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "ラベルで絞り込み" }),
      "senbatsu"
    );
    vi.mocked(replaceListFilterParams).mockClear();

    await user.click(screen.getByRole("button", { name: "絞り込みを解除" }));

    expect(replaceListFilterParams).toHaveBeenCalledExactlyOnceWith({
      groupId: "",
      label: "",
      generation: "",
      includeOther: "",
    });
  });

  it("queryもresetで空文字へ戻る", async () => {
    const groupA = createGroup();
    const songs = [createSong({ title: "はじめての曲" })];
    const songSections = buildSections(songs, groupA);
    const user = userEvent.setup();
    render(<SongBrowser groups={[groupA]} songs={songs} songSections={songSections} />);

    const queryInput = screen.getByRole("searchbox", { name: "楽曲タイトルで検索" });
    await user.type(queryInput, "一致しない検索語");

    expect(
      screen.getByText("条件に一致する楽曲が見つかりません")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "絞り込みを解除" }));

    expect(
      screen.queryByText("条件に一致する楽曲が見つかりません")
    ).not.toBeInTheDocument();
    expect(queryInput).toHaveValue("");
  });

  // #487 P2-1: 既定filter（includeOther=false）のままでもcatch-allラベルの曲だけの
  // ときは0件になりうる。押しても何も変わらないresetを出さないことを確認する。
  it("既定のincludeOther=falseのままcatch-allラベルの曲だけで0件のとき、no-match文言は出るがresetボタンは出ない", () => {
    const catchallGroup = createGroup({ id: "catchall", isCatchall: true });
    const songs = [
      createSong({ groupId: "catchall", groupNameJa: "その他", isCatchall: true }),
    ];
    const songSections = buildSections(songs, catchallGroup);
    render(<SongBrowser groups={[catchallGroup]} songs={songs} songSections={songSections} />);

    expect(
      screen.getByText("条件に一致する楽曲が見つかりません")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "絞り込みを解除" })
    ).not.toBeInTheDocument();
  });
});

describe("SongBrowser のstatus id / aria-controls", () => {
  it("CollectionResultStatusがidを持ち、件数に影響する各filter controlがaria-controlsで同じidを参照する", async () => {
    const groupA = createGroup();
    const songs = [createSong({ label: "generation", generation: "1" })];
    const songSections = buildSections(songs, groupA);
    const user = userEvent.setup();
    render(<SongBrowser groups={[groupA]} songs={songs} songSections={songSections} />);

    const status = screen.getByRole("status");
    expect(status.id).toBeTruthy();

    // 期selectはグループ選択かつラベル=期別のときのみ出現するため、先に選択する
    await user.selectOptions(
      screen.getByRole("combobox", { name: "グループで絞り込み" }),
      "group-a"
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "ラベルで絞り込み" }),
      "generation"
    );

    const controls = [
      screen.getByRole("combobox", { name: "グループで絞り込み" }),
      screen.getByRole("combobox", { name: "ラベルで絞り込み" }),
      screen.getByRole("combobox", { name: "期で絞り込み" }),
      screen.getByRole("searchbox", { name: "楽曲タイトルで検索" }),
      screen.getByRole("checkbox", { name: "その他も含む" }),
    ];
    for (const control of controls) {
      expect(control).toHaveAttribute("aria-controls", status.id);
    }
  });
});
