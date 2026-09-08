import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SetlistDetail } from "@/components/lives/SetlistDetail";
import type { LivePerformance } from "@/types/live";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    replace: _replace,
    ...props
  }: {
    children: ReactNode;
    href: string | { pathname?: string };
    replace?: boolean;
  } & Omit<ComponentProps<"a">, "href">) => (
    <a
      data-replace={_replace ? "true" : undefined}
      href={typeof href === "string" ? href : (href.pathname ?? "#")}
      {...props}
    >
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

const LIVE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERFORMANCE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const performance: LivePerformance = {
  id: PERFORMANCE_ID,
  venueId: null,
  venueName: null,
  venuePrefecture: null,
  performanceDate: "2026-08-23",
  doorsOpenAt: "15:30",
  startsAt: "18:00",
  hasStreaming: false,
  hasLiveViewing: false,
  sortOrder: 0,
  absences: [],
  setlistItems: [],
};

describe("SetlistDetail の親Live導線", () => {
  it("route上で検証済みのperformance IDをLive詳細へ引き継ぐ", () => {
    render(
      <SetlistDetail
        live={{ id: LIVE_ID, name: "テストライブ", liveType: "tour" }}
        performance={performance}
        isAdmin={false}
        dateContext={null}
      />
    );

    expect(
      screen.getByRole("link", { name: "← テストライブ" })
    ).toHaveAttribute(
      "href",
      `/lives/${LIVE_ID}?performance=${PERFORMANCE_ID}`
    );
    expect(
      screen.getByRole("link", { name: "← テストライブ" })
    ).toHaveAttribute("data-replace", "true");
  });

  it("Top起点の検証済みdateとperformance IDを親Liveへ引き継ぐ", () => {
    render(
      <SetlistDetail
        live={{ id: LIVE_ID, name: "テストライブ", liveType: "tour" }}
        performance={performance}
        isAdmin={false}
        dateContext="2026-08-23"
      />
    );

    expect(screen.getByRole("link", { name: "← テストライブ" })).toHaveAttribute(
      "href",
      `/lives/${LIVE_ID}?date=2026-08-23&performance=${PERFORMANCE_ID}`
    );
  });
});
