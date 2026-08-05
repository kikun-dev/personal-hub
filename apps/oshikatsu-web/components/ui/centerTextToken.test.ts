// #484 / GF-SAKA-003 の回帰固定テスト。
// センター文字は raw palette utility `text-amber-600` へ直結しており、通常文字用の
// theme別semantic token（--center-text）が存在しなかった。light側のrendered contrastが
// 3.19〜3.20:1で、12〜14pxの通常文字に必要な4.5:1を満たしていなかった。
// このテストは、追加したtokenの定義位置・値・DESIGN.mdとの整合・実contrastを固定する。
//
// app/globals.css は app/**/*.test.ts を収集対象に含めていない
// vitest.config.ts（lib/ usecases/ playwright/ components/ のみ）の外にあるため、
// 既存構成（include設定）を変えずに済むよう、このテストは対象ファイルをnode:fsで
// 直接読みに行くcomponents/ui配下（interactionStyles.test.tsと同じ静的検査パターン）に置く。
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor } from "@/playwright/contrast";

const APP_ROOT = path.resolve(__dirname, "..", "..");
const GLOBALS_CSS_PATH = path.join(APP_ROOT, "app/globals.css");
const DESIGN_MD_PATH = path.join(APP_ROOT, "DESIGN.md");

const globalsCssSource = readFileSync(GLOBALS_CSS_PATH, "utf-8");
const designMdSource = readFileSync(DESIGN_MD_PATH, "utf-8");

const MINIMUM_NORMAL_TEXT_CONTRAST = 4.5;

const CENTER_TEXT_DECLARATION_PATTERN = /--center-text:\s*(#[0-9a-fA-F]{6})\s*;/;
// センター文字が実際に載る面は、Member参加楽曲(Card) / Song formation(Card) /
// Setlist formation(ページ背景)のいずれも --background。背景値をここへ写経すると
// --background 変更時にテストだけ古い前提で通り続けるため、同じ globals.css から読む。
const BACKGROUND_DECLARATION_PATTERN = /--background:\s*(#[0-9a-fA-F]{6})\s*;/;
const COLOR_CENTER_TEXT_DECLARATION_PATTERN =
  /--color-center-text:\s*var\(--center-text\)\s*;/;

// ":root {...}"（light）セクションを切り出す。ファイル冒頭の最初の:rootブロック
// （dark用の:rootは@media内にネストされているため、最初のマッチは必ずlightになる）。
function extractLightRootSection(source: string): string {
  const match = source.match(/:root\s*\{([^}]*)\}/);
  if (!match) {
    throw new Error(":root（light）セクションが見つかりません");
  }
  return match[1];
}

// "@theme inline {...}" セクションを切り出す。
function extractThemeInlineSection(source: string): string {
  const match = source.match(/@theme inline\s*\{([^}]*)\}/);
  if (!match) {
    throw new Error("@theme inline セクションが見つかりません");
  }
  return match[1];
}

// "@media (prefers-color-scheme: dark) { :root {...} }" 内の:rootセクションを切り出す。
function extractDarkRootSection(source: string): string {
  const match = source.match(
    /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/
  );
  if (!match) {
    throw new Error("dark media queryの:rootセクションが見つかりません");
  }
  return match[1];
}

// DESIGN.mdのYAML frontmatterから `key: "value"` 形式で1値取り出す。
function extractDesignMdColor(source: string, key: string): string {
  const pattern = new RegExp(`^\\s*${key}:\\s*"(#[0-9A-Fa-f]{6})"`, "m");
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`DESIGN.mdに${key}が見つかりません`);
  }
  return match[1];
}

describe("app/globals.css の --center-text token (#484)", () => {
  const lightRootSection = extractLightRootSection(globalsCssSource);
  const themeInlineSection = extractThemeInlineSection(globalsCssSource);
  const darkRootSection = extractDarkRootSection(globalsCssSource);

  it(":root（light）に --center-text: #8a5a00 が定義されている", () => {
    const match = lightRootSection.match(CENTER_TEXT_DECLARATION_PATTERN);
    expect(match, "--center-text がlightの:rootに見つかりません").not.toBeNull();
    expect(match?.[1].toLowerCase()).toBe("#8a5a00");
  });

  it("dark media queryの:rootに --center-text: #d4af37 が定義されている", () => {
    const match = darkRootSection.match(CENTER_TEXT_DECLARATION_PATTERN);
    expect(match, "--center-text がdarkの:rootに見つかりません").not.toBeNull();
    expect(match?.[1].toLowerCase()).toBe("#d4af37");
  });

  it("@theme inline に --color-center-text: var(--center-text) が定義されている", () => {
    expect(themeInlineSection).toMatch(COLOR_CENTER_TEXT_DECLARATION_PATTERN);
  });

  it("DESIGN.mdのcenter-text-light/darkがglobals.cssの値と一致する", () => {
    const lightHex = lightRootSection.match(CENTER_TEXT_DECLARATION_PATTERN)?.[1];
    const darkHex = darkRootSection.match(CENTER_TEXT_DECLARATION_PATTERN)?.[1];
    if (!lightHex || !darkHex) {
      throw new Error("globals.cssから--center-textの値を取得できません");
    }

    const designMdLight = extractDesignMdColor(designMdSource, "center-text-light");
    const designMdDark = extractDesignMdColor(designMdSource, "center-text-dark");

    expect(designMdLight.toLowerCase()).toBe(lightHex.toLowerCase());
    expect(designMdDark.toLowerCase()).toBe(darkHex.toLowerCase());
  });

  it("light値が同テーマの--backgroundに対して通常文字の4.5:1以上を満たす", () => {
    const lightHex = lightRootSection.match(CENTER_TEXT_DECLARATION_PATTERN)?.[1];
    const backgroundHex = lightRootSection.match(BACKGROUND_DECLARATION_PATTERN)?.[1];
    if (!lightHex || !backgroundHex) {
      throw new Error("globals.cssからlightの--center-text / --backgroundを取得できません");
    }

    const ratio = contrastRatio(parseColor(lightHex), parseColor(backgroundHex));
    expect(ratio).toBeGreaterThanOrEqual(MINIMUM_NORMAL_TEXT_CONTRAST);
  });

  it("dark値が同テーマの--backgroundに対して通常文字の4.5:1以上を満たす", () => {
    const darkHex = darkRootSection.match(CENTER_TEXT_DECLARATION_PATTERN)?.[1];
    const backgroundHex = darkRootSection.match(BACKGROUND_DECLARATION_PATTERN)?.[1];
    if (!darkHex || !backgroundHex) {
      throw new Error("globals.cssからdarkの--center-text / --backgroundを取得できません");
    }

    const ratio = contrastRatio(parseColor(darkHex), parseColor(backgroundHex));
    expect(ratio).toBeGreaterThanOrEqual(MINIMUM_NORMAL_TEXT_CONTRAST);
  });
});
