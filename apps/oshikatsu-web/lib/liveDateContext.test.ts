import { describe, expect, it } from "vitest";
import { resolveLiveDetailContext } from "@/lib/liveDateContext";

const PERFORMANCE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PERFORMANCE_ID = "22222222-2222-4222-8222-222222222222";
const NONEXISTENT_PERFORMANCE_ID = "33333333-3333-4333-8333-333333333333";

const performances = [
  { id: PERFORMANCE_ID, performanceDate: "2026-08-23" },
  { id: OTHER_PERFORMANCE_ID, performanceDate: "2026-08-24" },
] as const;

describe("resolveLiveDetailContext", () => {
  it("parameterなしはbare overviewとして解決する", () => {
    expect(resolveLiveDetailContext(undefined, undefined, performances)).toEqual({
      kind: "overview",
    });
  });

  it("対象Liveに属するvalidなperformance単独を明示選択として解決する", () => {
    expect(
      resolveLiveDetailContext(undefined, PERFORMANCE_ID, performances)
    ).toEqual({ kind: "performance", performanceId: PERFORMANCE_ID });
  });

  it("大文字を含む同一UUIDをcanonical lowercaseへ正規化して解決する", () => {
    expect(
      resolveLiveDetailContext(
        undefined,
        PERFORMANCE_ID.toUpperCase(),
        performances
      )
    ).toEqual({ kind: "performance", performanceId: PERFORMANCE_ID });
  });

  it("dateとperformance dateが一致するvalidなTop contextを解決する", () => {
    expect(
      resolveLiveDetailContext("2026-08-23", PERFORMANCE_ID, performances)
    ).toEqual({
      kind: "top",
      date: "2026-08-23",
      performanceId: PERFORMANCE_ID,
    });
  });

  it.each([
    ["malformed UUID", undefined, "not-a-uuid"],
    ["存在しないID", undefined, NONEXISTENT_PERFORMANCE_ID],
    ["別LiveのID", undefined, "44444444-4444-4444-8444-444444444444"],
  ])("%sはbare overviewへfallbackする", (_label, date, performanceId) => {
    expect(resolveLiveDetailContext(date, performanceId, performances)).toEqual({
      kind: "overview",
    });
  });

  it("Top contextでdateとperformance dateが不一致ならbare overviewへfallbackする", () => {
    expect(
      resolveLiveDetailContext("2026-08-24", PERFORMANCE_ID, performances)
    ).toEqual({ kind: "overview" });
  });

  it.each(["invalid-date", "2026-02-30", ""]) (
    "dateが不正な値(%s)ならvalid performanceを単独選択へ格下げしない",
    (date) => {
      expect(resolveLiveDetailContext(date, PERFORMANCE_ID, performances)).toEqual({
        kind: "overview",
      });
    }
  );
});
