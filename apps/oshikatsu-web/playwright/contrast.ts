import { expect, type Locator, type Page } from "@playwright/test";

// rendered colorのcontrast計測ユーティリティ。semantic-ui-state / form-focus-ring の
// 両specが共有する（DESIGN.mdの通常/補助文字4.5:1、操作境界/focus 3:1の自動検証）。

export type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export const themes = ["light", "dark"] as const;

export const viewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
] as const;

export function parseColor(value: string): Rgba {
  const normalized = value.trim();
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((character) => character.repeat(2))
            .join("")
        : hex;
    if (expanded.length !== 6) {
      throw new Error(`未対応のhex colorです: ${value}`);
    }
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a: 1,
    };
  }

  const oklchMatch = normalized.match(
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)%?)?\s*\)$/
  );
  if (oklchMatch) {
    const lightness =
      Number(oklchMatch[1]) / (oklchMatch[2] === "%" ? 100 : 1);
    const chroma = Number(oklchMatch[3]);
    const hue = (Number(oklchMatch[4]) * Math.PI) / 180;
    const alpha = oklchMatch[5] ? Number(oklchMatch[5]) : 1;
    const a = chroma * Math.cos(hue);
    const b = chroma * Math.sin(hue);

    const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
    const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
    const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
    const l = lRoot ** 3;
    const m = mRoot ** 3;
    const s = sRoot ** 3;
    const linear = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    const toSrgb = (channel: number): number => {
      const value =
        channel <= 0.0031308
          ? 12.92 * channel
          : 1.055 * channel ** (1 / 2.4) - 0.055;
      return Math.min(1, Math.max(0, value)) * 255;
    };

    return {
      r: toSrgb(linear[0]),
      g: toSrgb(linear[1]),
      b: toSrgb(linear[2]),
      a: alpha,
    };
  }

  const match = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (!match) {
    throw new Error(`未対応のCSS colorです: ${value}`);
  }
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`CSS colorを解析できません: ${value}`);
  }
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts[3] ?? 1,
  };
}

export function composite(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  return {
    r:
      (foreground.r * foreground.a +
        background.r * background.a * (1 - foreground.a)) /
      alpha,
    g:
      (foreground.g * foreground.a +
        background.g * background.a * (1 - foreground.a)) /
      alpha,
    b:
      (foreground.b * foreground.a +
        background.b * background.a * (1 - foreground.a)) /
      alpha,
    a: alpha,
  };
}

export function relativeLuminance(color: Rgba): number {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

export function expectContrastAtLeast(
  foreground: Rgba,
  background: Rgba,
  minimumRatio: number,
  label: string
): void {
  expect(
    contrastRatio(foreground, background),
    `${label}のcontrastが${minimumRatio}:1未満です`
  ).toBeGreaterThanOrEqual(minimumRatio);
}

export function expectAaContrastColors(
  foreground: Rgba,
  background: Rgba,
  label: string
): void {
  expectContrastAtLeast(foreground, background, 4.5, label);
}

export function expectAaContrast(
  foreground: string,
  background: string,
  label: string
): void {
  const backgroundColor = parseColor(background);
  const foregroundColor = composite(parseColor(foreground), backgroundColor);
  expectAaContrastColors(foregroundColor, backgroundColor, label);
}

export async function expectRenderedTextContrast(
  locator: Locator,
  background: string,
  label: string
): Promise<void> {
  const colors = await locator.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).color)
  );
  expect(colors.length, `${label}がrenderされていません`).toBeGreaterThan(0);
  for (const [index, color] of colors.entries()) {
    expectAaContrast(color, background, `${label}[${index}]`);
  }
}

// 直前のfocusを外してからTabで対象へ到達する。keyboard操作を経ることで、
// text field以外でも:focus-visibleが確実にmatchする状態を作る。
export async function focusWithKeyboard(
  page: Page,
  target: Locator
): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
  }

  throw new Error("対象要素へTabで到達できませんでした。");
}
