import { describe, expect, it } from "vitest";
import { parseColor, type Rgba } from "./contrast";

function expectRgbaClose(actual: Rgba, expected: Rgba): void {
  expect(actual.r).toBeCloseTo(expected.r, 8);
  expect(actual.g).toBeCloseTo(expected.g, 8);
  expect(actual.b).toBeCloseTo(expected.b, 8);
  expect(actual.a).toBeCloseTo(expected.a, 8);
}

describe("parseColor", () => {
  it("oklabを等価なoklchと同じRgbaへ変換する", () => {
    const oklab = parseColor("oklab(0.5 0.1 0 / 0.7)");
    const oklch = parseColor("oklch(0.5 0.1 0 / 0.7)");

    expectRgbaClose(oklab, oklch);
  });

  it("oklabのLを数値とpercentageの両方で解釈する", () => {
    expectRgbaClose(
      parseColor("oklab(50% 0.1 0)"),
      parseColor("oklab(0.5 0.1 0)")
    );
  });

  it("oklabのalphaを数値とpercentageの両方で解釈する", () => {
    expectRgbaClose(
      parseColor("oklab(0.5 0.1 0 / 70%)"),
      parseColor("oklab(0.5 0.1 0 / 0.7)")
    );
  });

  it("oklabの負のaとbを解釈する", () => {
    const color = parseColor("oklab(0.6 -0.1 -0.05)");

    expect(color.r).toBeTypeOf("number");
    expect(color.g).toBeTypeOf("number");
    expect(color.b).toBeTypeOf("number");
    expect(color.a).toBe(1);
  });

  it("Tailwind v4が返すoklabのcomputed colorを解釈する", () => {
    const color = parseColor(
      "oklab(0.946099 0.0000428557 0.0000189543 / 0.7)"
    );

    expect(color.r).toBeGreaterThanOrEqual(0);
    expect(color.g).toBeGreaterThanOrEqual(0);
    expect(color.b).toBeGreaterThanOrEqual(0);
    expect(color.a).toBeCloseTo(0.7);
  });

  it("oklchのpercentage alphaも0から1へ正規化する", () => {
    expectRgbaClose(
      parseColor("oklch(0.5 0.1 0 / 70%)"),
      parseColor("oklch(0.5 0.1 0 / 0.7)")
    );
  });

  it("既存のhexとrgbを引き続き解釈する", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("rgba(1, 2, 3, 0.4)")).toEqual({
      r: 1,
      g: 2,
      b: 3,
      a: 0.4,
    });
  });

  it("解釈できない形式は引き続きthrowする", () => {
    expect(() => parseColor("oklab(これは色ではない)")).toThrow(
      "未対応のCSS colorです"
    );
  });
});
