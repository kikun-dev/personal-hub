import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeListBackNavigation,
  hasListBackNavigation,
  registerListBackNavigation,
} from "@/components/ui/listBackNavigation";

const FILTERED_LIST_HREF = "http://localhost:3001/lives?groupId=group-a";
const DETAIL_HREF = "http://localhost:3001/lives/live-a";
const FALLBACK_HREF = "/lives";

describe("list back navigation markerのライフサイクル", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", FILTERED_LIST_HREF);
  });

  it("確認では消費せず、最終的な一覧復帰操作で一度だけ消費する", () => {
    registerListBackNavigation({
      fallbackHref: FALLBACK_HREF,
      targetHref: DETAIL_HREF,
    });

    expect(
      hasListBackNavigation({
        currentHref: DETAIL_HREF,
        fallbackHref: FALLBACK_HREF,
      })
    ).toBe(true);
    expect(
      hasListBackNavigation({
        currentHref: DETAIL_HREF,
        fallbackHref: FALLBACK_HREF,
      })
    ).toBe(true);
    expect(
      consumeListBackNavigation({
        currentHref: DETAIL_HREF,
        fallbackHref: FALLBACK_HREF,
      })
    ).toBe(true);
    expect(
      hasListBackNavigation({
        currentHref: DETAIL_HREF,
        fallbackHref: FALLBACK_HREF,
      })
    ).toBe(false);
  });

  it("対象detailと一致しないmarkerは受理せず、consume時に破棄する", () => {
    registerListBackNavigation({
      fallbackHref: FALLBACK_HREF,
      targetHref: DETAIL_HREF,
    });

    const otherDetailHref = "http://localhost:3001/lives/live-b";
    expect(
      hasListBackNavigation({
        currentHref: otherDetailHref,
        fallbackHref: FALLBACK_HREF,
      })
    ).toBe(false);
    expect(
      consumeListBackNavigation({
        currentHref: otherDetailHref,
        fallbackHref: FALLBACK_HREF,
      })
    ).toBe(false);
    expect(
      hasListBackNavigation({
        currentHref: DETAIL_HREF,
        fallbackHref: FALLBACK_HREF,
      })
    ).toBe(false);
  });
});
