import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemberBrowser } from "@/components/members/MemberBrowser";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import type { Group } from "@/types/group";
import type { MemberListItem } from "@/types/member";

// resetアクションのURL反映（history.replaceState）を実インスタンスなしで検証するため、
// 呼び出し引数だけをvi.fnで観測する。
vi.mock("@/lib/listFilterUrl", () => ({
  replaceListFilterParams: vi.fn(),
}));

// MemberCardが内部でPendingLink（next/link）を使うため、
// MemberSongsSection.test.tsx / SetlistEditor.test.tsxと同じ方針でアンカーへ差し替える。
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

// MemberBrowserはURLクエリを読むだけで、このテストでは初期状態（未指定）に固定する。
// クエリ→state同期自体はMemberBrowser側の既存責務でありこのテストの対象外。
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
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

function createMember(overrides: Partial<MemberListItem> = {}): MemberListItem {
  return {
    id: "member-1",
    imageUrl: null,
    nameJa: "テストメンバー",
    nameKana: "てすとめんばー",
    groups: [],
    ...overrides,
  };
}

describe("MemberBrowser のfilter変更時の件数表示", () => {
  it("グループ絞り込みで件数が変わると、同じstatus nodeの内容が更新される", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const groupB = createGroup({ id: "group-b", nameJa: "グループB" });
    const members: MemberListItem[] = [
      createMember({
        id: "member-1",
        nameJa: "メンバー1",
        groups: [
          {
            id: "mg-1",
            groupId: "group-a",
            groupNameJa: "グループA",
            groupColor: "#000000",
            generation: null,
            joinedAt: null,
            graduatedAt: null,
          },
        ],
      }),
      createMember({
        id: "member-2",
        nameJa: "メンバー2",
        groups: [
          {
            id: "mg-2",
            groupId: "group-a",
            groupNameJa: "グループA",
            groupColor: "#000000",
            generation: null,
            joinedAt: null,
            graduatedAt: null,
          },
        ],
      }),
      createMember({
        id: "member-3",
        nameJa: "メンバー3",
        groups: [
          {
            id: "mg-3",
            groupId: "group-b",
            groupNameJa: "グループB",
            groupColor: "#000000",
            generation: null,
            joinedAt: null,
            graduatedAt: null,
          },
        ],
      }),
    ];

    const user = userEvent.setup();
    render(<MemberBrowser groups={[groupA, groupB]} members={members} />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("3人");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "グループで絞り込み" }),
      "group-a"
    );

    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("2人");
  });
});

describe("MemberBrowser のEmpty分岐", () => {
  it("元データ自体が0件のとき、resource不在の文言が出てresetボタンは無い", () => {
    render(<MemberBrowser groups={[]} members={[]} />);

    expect(
      screen.getByText("まだメンバーが登録されていません")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "絞り込みを解除" })
    ).not.toBeInTheDocument();
  });

  it("filter適用で0件になったとき、no-matchの文言とresetボタンが出る", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const members: MemberListItem[] = [
      createMember({
        id: "member-1",
        nameJa: "メンバー1",
        groups: [
          {
            id: "mg-1",
            groupId: "group-a",
            groupNameJa: "グループA",
            groupColor: "#000000",
            generation: null,
            joinedAt: null,
            graduatedAt: null,
          },
        ],
      }),
    ];
    const user = userEvent.setup();
    render(<MemberBrowser groups={[groupA]} members={members} />);

    // 在籍者のみのfixtureに対し「卒業」で絞り込むと0件になる
    await user.selectOptions(
      screen.getByRole("combobox", { name: "在籍状況で絞り込み" }),
      "graduated"
    );

    expect(
      screen.getByText("条件に一致するメンバーが見つかりません")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "絞り込みを解除" })
    ).toBeInTheDocument();
  });

  it("resetを押すと表示が復帰し、filter stateが既定へ戻る", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const members: MemberListItem[] = [
      createMember({
        id: "member-1",
        nameJa: "メンバー1",
        groups: [
          {
            id: "mg-1",
            groupId: "group-a",
            groupNameJa: "グループA",
            groupColor: "#000000",
            generation: null,
            joinedAt: null,
            graduatedAt: null,
          },
        ],
      }),
    ];
    const user = userEvent.setup();
    render(<MemberBrowser groups={[groupA]} members={members} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "在籍状況で絞り込み" }),
      "graduated"
    );
    expect(
      screen.getByRole("button", { name: "絞り込みを解除" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "絞り込みを解除" }));

    expect(
      screen.queryByText("条件に一致するメンバーが見つかりません")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "在籍状況で絞り込み" })
    ).toHaveValue("active");
    // 0件表示が消えるだけでなく、実際にメンバーが描画されるところまで確認する
    expect(screen.getByText("メンバー1")).toBeInTheDocument();
  });

  it("resetでreplaceListFilterParamsが既定値で呼ばれる", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const members: MemberListItem[] = [
      createMember({
        id: "member-1",
        nameJa: "メンバー1",
        groups: [
          {
            id: "mg-1",
            groupId: "group-a",
            groupNameJa: "グループA",
            groupColor: "#000000",
            generation: null,
            joinedAt: null,
            graduatedAt: null,
          },
        ],
      }),
    ];
    const user = userEvent.setup();
    render(<MemberBrowser groups={[groupA]} members={members} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "在籍状況で絞り込み" }),
      "graduated"
    );
    vi.mocked(replaceListFilterParams).mockClear();

    await user.click(screen.getByRole("button", { name: "絞り込みを解除" }));

    expect(replaceListFilterParams).toHaveBeenCalledExactlyOnceWith({
      groupId: "",
      generation: "",
      status: "",
    });
  });

  // #487 P2-1: 既定filter（status="active"）のままでも0件になりうる
  // （全員卒業済みの場合）。押しても何も変わらないresetを出さないことを確認する。
  it("既定のstatus=activeのまま全員卒業済みで0件のとき、no-match文言は出るがresetボタンは出ない", () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const members: MemberListItem[] = [
      createMember({
        id: "member-1",
        nameJa: "メンバー1",
        groups: [
          {
            id: "mg-1",
            groupId: "group-a",
            groupNameJa: "グループA",
            groupColor: "#000000",
            generation: null,
            joinedAt: null,
            graduatedAt: "2020-01-01",
          },
        ],
      }),
    ];
    render(<MemberBrowser groups={[groupA]} members={members} />);

    expect(
      screen.getByText("条件に一致するメンバーが見つかりません")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "絞り込みを解除" })
    ).not.toBeInTheDocument();
  });

  // レビュー追加指摘: hasActiveFilter（現在値が既定と異なるか）だけでは、
  // reset後の既定条件（status="active"）自体が0件になる場合を判定できない。
  // 全員卒業済みのデータでグループを選択するとhasActiveFilter=trueになるが、
  // resetしても既定status="active"のままでは0件が続くため、resetボタンは
  // 出さず理由と対処を示す文言を出す。
  it("全員卒業済み＋グループ選択のとき、resetボタンは出ず既定条件で表示できない旨の説明が出る", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const members: MemberListItem[] = [
      createMember({
        id: "member-1",
        nameJa: "メンバー1",
        groups: [
          {
            id: "mg-1",
            groupId: "group-a",
            groupNameJa: "グループA",
            groupColor: "#000000",
            generation: null,
            joinedAt: null,
            graduatedAt: "2020-01-01",
          },
        ],
      }),
    ];
    const user = userEvent.setup();
    render(<MemberBrowser groups={[groupA]} members={members} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "グループで絞り込み" }),
      "group-a"
    );

    expect(
      screen.getByText("条件に一致するメンバーが見つかりません")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "絞り込みを解除" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "現役のメンバーがいないため、既定の絞り込みでは表示できません。在籍状況を「全員」に変えると表示できます。"
      )
    ).toBeInTheDocument();
  });
});

describe("MemberBrowser のstatus id / aria-controls", () => {
  it("CollectionResultStatusがidを持ち、件数に影響する各filter controlがaria-controlsで同じidを参照する", async () => {
    const groupA = createGroup({ id: "group-a", nameJa: "グループA" });
    const members: MemberListItem[] = [
      createMember({
        id: "member-1",
        nameJa: "メンバー1",
        groups: [
          {
            id: "mg-1",
            groupId: "group-a",
            groupNameJa: "グループA",
            groupColor: "#000000",
            generation: "1",
            joinedAt: null,
            graduatedAt: null,
          },
        ],
      }),
    ];
    const user = userEvent.setup();
    render(<MemberBrowser groups={[groupA]} members={members} />);

    const status = screen.getByRole("status");
    expect(status.id).toBeTruthy();

    // 期selectはグループ選択時のみ出現するため、先にグループを選択する
    await user.selectOptions(
      screen.getByRole("combobox", { name: "グループで絞り込み" }),
      "group-a"
    );

    const controls = [
      screen.getByRole("combobox", { name: "グループで絞り込み" }),
      screen.getByRole("combobox", { name: "期で絞り込み" }),
      screen.getByRole("combobox", { name: "在籍状況で絞り込み" }),
    ];
    for (const control of controls) {
      expect(control).toHaveAttribute("aria-controls", status.id);
    }
  });
});
