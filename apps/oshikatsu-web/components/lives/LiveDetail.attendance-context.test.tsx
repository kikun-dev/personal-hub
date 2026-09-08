import type { ComponentProps, ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveDetail } from "@/components/lives/LiveDetail";
import type { Live } from "@/types/live";

const { routerRefresh, upsertAttendanceAction } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
  upsertAttendanceAction: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    replace: _replace,
    ...props
  }: {
    children: ReactNode;
    href: string | { pathname?: string };
    prefetch?: boolean;
    replace?: boolean;
  } & Omit<ComponentProps<"a">, "href">) => {
    void _prefetch;
    void _replace;
    return (
      <a
        href={typeof href === "string" ? href : (href.pathname ?? "#")}
        {...props}
      >
        {children}
      </a>
    );
  },
  useLinkStatus: () => ({ pending: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: routerRefresh }),
}));

vi.mock("@/app/(authenticated)/lives/[id]/actions", () => ({
  upsertAttendanceAction,
  deleteAttendanceAction: vi.fn(),
}));

const LIVE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERFORMANCE_A_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PERFORMANCE_B_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const live: Live = {
  id: LIVE_ID,
  name: "テストツアー",
  liveType: "tour",
  description: null,
  performerGroups: [],
  performerMembers: [],
  performances: [
    {
      id: PERFORMANCE_A_ID,
      venueId: null,
      venueName: "福井会場",
      venuePrefecture: "福井県",
      performanceDate: "2026-08-23",
      doorsOpenAt: "15:30",
      startsAt: "18:00",
      hasStreaming: false,
      hasLiveViewing: false,
      sortOrder: 0,
      absences: [],
      setlistItems: [],
    },
    {
      id: PERFORMANCE_B_ID,
      venueId: null,
      venueName: "東京会場",
      venuePrefecture: "東京都",
      performanceDate: "2026-08-24",
      doorsOpenAt: "16:00",
      startsAt: "18:30",
      hasStreaming: false,
      hasLiveViewing: false,
      sortOrder: 1,
      absences: [],
      setlistItems: [],
    },
  ],
};

function thisPerformanceSection(): HTMLElement {
  const heading = screen.getByRole("heading", { name: "この公演" });
  const section = heading.closest("section");
  if (section === null) {
    throw new Error("この公演セクションが見つかりませんでした。");
  }
  return section;
}

describe("LiveDetailの公演切り替えと参戦記録", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    upsertAttendanceAction.mockReset();
    upsertAttendanceAction.mockResolvedValue({});
  });

  it("Aを編集中にBへ切り替えた後はBのIDと入力値だけを保存する", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LiveDetail
        live={live}
        myAttendances={{}}
        context={{ kind: "performance", performanceId: PERFORMANCE_A_ID }}
      />
    );

    let section = thisPerformanceSection();
    await user.click(within(section).getByRole("button", { name: "参戦を記録" }));
    await user.selectOptions(within(section).getByLabelText("参戦種別"), "onsite");
    await user.type(within(section).getByLabelText("座席メモ"), "Aの入力途中");

    rerender(
      <LiveDetail
        live={live}
        myAttendances={{}}
        context={{ kind: "performance", performanceId: PERFORMANCE_B_ID }}
      />
    );

    section = thisPerformanceSection();
    expect(within(section).getByText("東京公演")).toBeInTheDocument();
    expect(within(section).queryByDisplayValue("Aの入力途中")).toBeNull();

    await user.click(within(section).getByRole("button", { name: "参戦を記録" }));
    await user.selectOptions(
      within(section).getByLabelText("参戦種別"),
      "streaming"
    );
    await user.type(within(section).getByLabelText("座席メモ"), "Bの座席");
    await user.click(within(section).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(upsertAttendanceAction).toHaveBeenCalledWith({
        performanceId: PERFORMANCE_B_ID,
        attendedType: "streaming",
        seatNote: "Bの座席",
        note: "",
      });
    });
    expect(upsertAttendanceAction).not.toHaveBeenCalledWith(
      expect.objectContaining({ performanceId: PERFORMANCE_A_ID })
    );
  });
});
