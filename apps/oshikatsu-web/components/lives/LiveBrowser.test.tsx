import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LiveBrowser } from "@/components/lives/LiveBrowser";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import type { Group } from "@/types/group";
import type { LiveListItem } from "@/types/live";

// LiveCardが内部でPendingLink（next/link）を使うため、
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

// LiveBrowserはURLクエリを読むだけで、このテストでは初期状態（未指定）に固定する。
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

function createLive(overrides: Partial<LiveListItem> = {}): LiveListItem {
  return {
    id: "live-1",
    name: "テストライブ",
    liveType: "single",
    performerGroups: [],
    firstDate: "2020-01-01",
    lastDate: "2020-01-01",
    performanceCount: 1,
    ...overrides,
  };
}

describe("LiveBrowser のEmpty分岐", () => {
  it("元データ自体が0件のとき、resource不在の文言が出てresetボタンは無い", () => {
    render(<LiveBrowser groups={[]} lives={[]} />);

    expect(
      screen.getByText("まだライブが登録されていません")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "絞り込みを解除" })
    ).not.toBeInTheDocument();
  });

  it("filter適用で0件になったとき、no-matchの文言とresetボタンが出る", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const groupB = createGroup({ id: "group-b", nameJa: "グループB" });
    const lives: LiveListItem[] = [
      createLive({
        id: "live-1",
        performerGroups: [
          { groupId: "group-a", groupNameJa: "グループA", groupColor: "#000000" },
        ],
      }),
    ];
    const user = userEvent.setup();
    render(<LiveBrowser groups={[groupA, groupB]} lives={lives} />);

    // group-aのみ出演のfixtureに対しgroup-bで絞り込むと0件になる
    await user.selectOptions(
      screen.getByRole("combobox", { name: "出演グループで絞り込み" }),
      "group-b"
    );

    expect(
      screen.getByText("条件に一致するライブが見つかりません")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "絞り込みを解除" })
    ).toBeInTheDocument();
  });

  it("resetを押すと表示が復帰し、filter stateが既定へ戻る", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const groupB = createGroup({ id: "group-b", nameJa: "グループB" });
    const lives: LiveListItem[] = [
      createLive({
        id: "live-1",
        performerGroups: [
          { groupId: "group-a", groupNameJa: "グループA", groupColor: "#000000" },
        ],
      }),
    ];
    const user = userEvent.setup();
    render(<LiveBrowser groups={[groupA, groupB]} lives={lives} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "出演グループで絞り込み" }),
      "group-b"
    );
    expect(
      screen.getByRole("button", { name: "絞り込みを解除" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "絞り込みを解除" }));

    expect(
      screen.queryByText("条件に一致するライブが見つかりません")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "出演グループで絞り込み" })
    ).toHaveValue("");
  });

  it("resetでreplaceListFilterParamsが既定値で呼ばれる", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const groupB = createGroup({ id: "group-b", nameJa: "グループB" });
    const lives: LiveListItem[] = [
      createLive({
        id: "live-1",
        performerGroups: [
          { groupId: "group-a", groupNameJa: "グループA", groupColor: "#000000" },
        ],
      }),
    ];
    const user = userEvent.setup();
    render(<LiveBrowser groups={[groupA, groupB]} lives={lives} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "出演グループで絞り込み" }),
      "group-b"
    );
    vi.mocked(replaceListFilterParams).mockClear();

    await user.click(screen.getByRole("button", { name: "絞り込みを解除" }));

    expect(replaceListFilterParams).toHaveBeenCalledExactlyOnceWith({
      groupId: "",
    });
  });

  // #487 P2-1: Liveのfilterは出演グループ絞り込みのみで、groupId=""（既定）の
  // ときはfilterLivesByGroupが絞り込まずlives全体を返す。そのためisEmptyFiltered
  // （元データがありfilter結果が0件）がtrueになるのは、常にgroupIdが非既定
  // （=hasActiveFilter===true）のときに限られ、「既定filterのまま0件」は
  // isEmptySourceと同義になり作れない。Member/Songのような専用ケースは無理に
  // 作らず、上の「filter適用で0件→resetが出る」テストがこの前提を実質カバーする。
});

describe("LiveBrowser のstatus id / aria-controls", () => {
  it("CollectionResultStatusがidを持ち、出演グループselectがaria-controlsで同じidを参照する", () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    render(<LiveBrowser groups={[groupA]} lives={[]} />);

    const status = screen.getByRole("status");
    expect(status.id).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "出演グループで絞り込み" })
    ).toHaveAttribute("aria-controls", status.id);
  });
});
