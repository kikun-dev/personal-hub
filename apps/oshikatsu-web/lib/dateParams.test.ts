import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTodayInAppTimeZone, parseStrictYmd } from "@/lib/dateParams";

// #412: 固定日の厳密パース。範囲外・存在しない日・形式違いは null（暗黙繰り上げを許さない）。
describe("parseStrictYmd", () => {
  it("実在する YYYY-MM-DD を Date にする", () => {
    const d = parseStrictYmd("2026-08-23");
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(7);
    expect(d?.getDate()).toBe(23);
  });

  it("範囲外の月（2026-13-01）は null", () => {
    expect(parseStrictYmd("2026-13-01")).toBeNull();
  });

  it("存在しない日（2026-02-30）は null（繰り上げを弾く）", () => {
    expect(parseStrictYmd("2026-02-30")).toBeNull();
  });

  it("形式違い（2026/08/23・8-23 等）は null", () => {
    expect(parseStrictYmd("2026/08/23")).toBeNull();
    expect(parseStrictYmd("2026-8-23")).toBeNull();
    expect(parseStrictYmd("garbage")).toBeNull();
  });
});

// #412: E2E 用の「今日」固定 seam（E2E_FIXED_TODAY）と、本番（Vercel）で無効化される
// ガードの契約を固定する。production 挙動を変えないことがこの seam の前提。
describe("getTodayInAppTimeZone の E2E_FIXED_TODAY seam", () => {
  const savedFixed = process.env.E2E_FIXED_TODAY;
  const savedVercel = process.env.VERCEL;

  beforeEach(() => {
    delete process.env.E2E_FIXED_TODAY;
    delete process.env.VERCEL;
  });

  afterEach(() => {
    if (savedFixed === undefined) delete process.env.E2E_FIXED_TODAY;
    else process.env.E2E_FIXED_TODAY = savedFixed;
    if (savedVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = savedVercel;
  });

  it("E2E_FIXED_TODAY が YYYY-MM-DD なら、その日付を「今日」として返す", () => {
    process.env.E2E_FIXED_TODAY = "2026-08-23";
    const today = getTodayInAppTimeZone();
    expect(today.getFullYear()).toBe(2026);
    expect(today.getMonth()).toBe(7); // 0-indexed: 8月
    expect(today.getDate()).toBe(23);
  });

  it("本番（process.env.VERCEL あり）では E2E_FIXED_TODAY を無視する", () => {
    process.env.E2E_FIXED_TODAY = "2026-08-23";
    process.env.VERCEL = "1";
    const now = new Date(2030, 0, 15); // 2030-01-15
    const today = getTodayInAppTimeZone(now);
    // seam は無効。渡した now（Asia/Tokyo 日付）がそのまま反映される
    expect(today.getFullYear()).toBe(2030);
    expect(today.getMonth()).toBe(0);
    expect(today.getDate()).toBe(15);
  });

  it("E2E_FIXED_TODAY が未設定なら渡した now を使う", () => {
    const now = new Date(2030, 0, 15);
    const today = getTodayInAppTimeZone(now);
    expect(today.getFullYear()).toBe(2030);
    expect(today.getMonth()).toBe(0);
    expect(today.getDate()).toBe(15);
  });

  it("E2E_FIXED_TODAY が不正（形式違い・範囲外・存在しない日）なら無視して now を使う", () => {
    const now = new Date(2030, 0, 15);
    for (const invalid of ["2026/08/23", "2026-13-01", "2026-02-30"]) {
      process.env.E2E_FIXED_TODAY = invalid;
      const today = getTodayInAppTimeZone(now);
      expect(today.getFullYear()).toBe(2030);
      expect(today.getDate()).toBe(15);
    }
  });
});
