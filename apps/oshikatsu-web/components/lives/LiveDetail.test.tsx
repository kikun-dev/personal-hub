import type { ComponentProps, ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveDetail } from "@/components/lives/LiveDetail";
import type { Live } from "@/types/live";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: {
    children: ReactNode;
    href: string | { pathname?: string };
    prefetch?: boolean;
  } & Omit<ComponentProps<"a">, "href">) => {
    void _prefetch;
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

const routerBack = vi.fn();
const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: routerBack, push: routerPush, refresh: vi.fn() }),
}));

vi.mock("@/components/lives/AttendanceControl", () => ({
  AttendanceControl: () => null,
}));

vi.mock("@/components/lives/PerformanceAttendanceArea", () => ({
  PerformanceAttendanceArea: () => null,
}));

vi.mock("@/components/lives/PerformanceCarousel", () => ({
  PerformanceCarousel: ({ children }: { children: ReactNode }) => (
    <div data-testid="live-performance-carousel">{children}</div>
  ),
}));

const LIVE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERFORMANCE_A_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PERFORMANCE_B_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const live: Live = {
  id: LIVE_ID,
  name: "テストツアー",
  liveType: "tour",
  description: "ライブ説明",
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

describe("LiveDetail の閲覧context", () => {
  it("bare overviewでは公演を自動選択せず、日程と一覧復帰ボタンを表示する", () => {
    render(<LiveDetail live={live} myAttendances={{}} context={{ kind: "overview" }} />);

    expect(screen.queryByRole("heading", { name: "この公演" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "公演ごとの情報" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "← ライブ一覧へ戻る" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /8\/23.*開場 15:30.*開演 18:00/ })
    ).toHaveAttribute(
      "href",
      `/lives/${LIVE_ID}?performance=${PERFORMANCE_A_ID}`
    );
  });

  it("performance単独選択は対象公演をprimary表示し、bare overviewへ戻せる", () => {
    render(
      <LiveDetail
        live={live}
        myAttendances={{}}
        context={{ kind: "performance", performanceId: PERFORMANCE_B_ID }}
      />
    );

    const thisPerformanceHeading = screen.getByRole("heading", {
      name: "この公演",
    });
    expect(thisPerformanceHeading).toBeInTheDocument();
    const thisPerformanceSection = thisPerformanceHeading.closest("section");
    expect(thisPerformanceSection).not.toBeNull();
    expect(
      within(thisPerformanceSection as HTMLElement).getByText("東京公演")
    ).toBeInTheDocument();
    expect(
      within(thisPerformanceSection as HTMLElement).getByText(/8\/24\(月\)/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← ライブ全体へ戻る" })
    ).toHaveAttribute("href", `/lives/${LIVE_ID}`);
    expect(screen.queryByTestId("live-performance-carousel")).toBeNull();
  });

  it("Top起点は対象公演をprimary表示し、選択日へ戻せる", () => {
    render(
      <LiveDetail
        live={live}
        myAttendances={{}}
        context={{
          kind: "top",
          date: "2026-08-24",
          performanceId: PERFORMANCE_B_ID,
        }}
      />
    );

    const thisPerformanceHeading = screen.getByRole("heading", {
      name: "この公演",
    });
    const thisPerformanceSection = thisPerformanceHeading.closest("section");
    expect(thisPerformanceSection).not.toBeNull();
    expect(
      within(thisPerformanceSection as HTMLElement).getByText("東京公演")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← 8/24の出来事へ戻る" })
    ).toHaveAttribute("href", "/?year=2026&month=8&day=24");
  });
});
