import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TourOverview, type TourOverviewGroup } from "@/components/lives/TourOverview";

// TourOverviewは初期表示4件・展開ボタンは5件目以降がある場合のみ出る（VISIBLE_GROUPS=4）。
function createGroups(count: number): TourOverviewGroup[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `group-${index}`,
    areaLabel: `${index}公演`,
    venueId: null,
    venueName: null,
    scheduleLines: [`7/${index + 1}(月) 開演 18:00`],
  }));
}

describe("TourOverview のトグル", () => {
  it("初期状態ではaria-expandedがfalseで、対象regionはDOMに存在する", () => {
    render(<TourOverview heading="ツアー概要" groups={createGroups(5)} />);

    const toggle = screen.getByRole("button", { name: "残り1会場を見る" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    const regionId = toggle.getAttribute("aria-controls");
    expect(regionId).not.toBeNull();
    expect(document.getElementById(regionId ?? "")).not.toBeNull();
  });

  it("クリック後にaria-expandedがtrueになり、aria-controlsの対象regionと一致する", async () => {
    const user = userEvent.setup();
    render(<TourOverview heading="ツアー概要" groups={createGroups(5)} />);

    const toggle = screen.getByRole("button", { name: "残り1会場を見る" });
    const regionId = toggle.getAttribute("aria-controls");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "折りたたむ" })).toBe(toggle);

    const region = document.getElementById(regionId ?? "");
    expect(region).not.toBeNull();
    expect(region?.id).toBe(regionId);
  });
});
