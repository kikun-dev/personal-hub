import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionResultStatus } from "@/components/ui/CollectionResultStatus";

describe("CollectionResultStatus のsemantics", () => {
  it("outputの暗黙roleによりrole=statusとして取得できる", () => {
    render(<CollectionResultStatus count={92} unit="人" />);

    const status = screen.getByRole("status");
    expect(status.tagName).toBe("OUTPUT");
  });

  it("aria-atomic=trueを持つ", () => {
    render(<CollectionResultStatus count={92} unit="人" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  });

  it("role/aria-liveを明示的に重複指定していない（outputの暗黙roleに任せる）", () => {
    render(<CollectionResultStatus count={92} unit="人" />);

    const status = screen.getByRole("status");
    expect(status).not.toHaveAttribute("role");
    expect(status).not.toHaveAttribute("aria-live");
  });

  it("件数が変わったとき、再マウントではなく同じnodeの内容が更新される", () => {
    const { rerender } = render(
      <CollectionResultStatus count={92} unit="人" />
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("92人");

    rerender(<CollectionResultStatus count={34} unit="人" />);

    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("34人");
  });

  it("呼び出し側のclassNameと任意属性が反映される", () => {
    render(
      <CollectionResultStatus
        count={5}
        unit="件"
        className="ml-auto shrink-0 text-sm text-foreground-secondary"
        data-ui="live-count"
      />
    );

    const status = screen.getByRole("status");
    expect(status.className).toContain("ml-auto");
    expect(status.className).toContain("text-foreground-secondary");
    expect(status).toHaveAttribute("data-ui", "live-count");
  });
});
