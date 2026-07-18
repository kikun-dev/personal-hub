import { describe, expect, it, vi } from "vitest";
import { createSongRepository } from "./songRepository";
import type { OrbitReadClient } from "@/types/orbitReadClient";

describe("songRepository.findCalendarVideoItemsInRanges", () => {
  it("MVと関連動画を1回のUNION RPCで取得する", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          track_id: "track-mv",
          track_title: "MV曲",
          group_name_ja: "乃木坂46",
          video_type: "mv",
          url: "https://example.com/mv",
          date: "2026-07-10",
        },
        {
          track_id: "track-live",
          track_title: "ライブ曲",
          group_name_ja: "日向坂46",
          video_type: "dance_practice",
          url: "https://example.com/live",
          date: "2026-07-11",
        },
      ],
      error: null,
    });
    const repository = createSongRepository({ rpc } as unknown as OrbitReadClient);

    const result = await repository.findCalendarVideoItemsInRanges([
      { startDate: "2026-07-01", endDate: "2027-07-01" },
      { startDate: "2025-01-01", endDate: "2025-02-01" },
    ]);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("find_orbit_calendar_videos_in_ranges", {
      range_1_start: "2026-07-01",
      range_1_end: "2027-07-01",
      range_2_start: "2025-01-01",
      range_2_end: "2025-02-01",
    });
    expect(result).toEqual([
      {
        trackId: "track-mv",
        trackTitle: "MV曲",
        groupNameJa: "乃木坂46",
        videoType: "mv",
        url: "https://example.com/mv",
        date: "2026-07-10",
      },
      {
        trackId: "track-live",
        trackTitle: "ライブ曲",
        groupNameJa: "日向坂46",
        videoType: "dance_practice",
        url: "https://example.com/live",
        date: "2026-07-11",
      },
    ]);
  });

  it("第2範囲がなければnullを渡す", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const repository = createSongRepository({ rpc } as unknown as OrbitReadClient);

    await repository.findCalendarVideoItemsInRanges([
      { startDate: "2026-07-01", endDate: "2027-07-01" },
    ]);

    expect(rpc).toHaveBeenCalledWith("find_orbit_calendar_videos_in_ranges", {
      range_1_start: "2026-07-01",
      range_1_end: "2027-07-01",
      range_2_start: null,
      range_2_end: null,
    });
  });
});
