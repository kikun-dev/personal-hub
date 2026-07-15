"use client";

// context 時のツアー全体 overview（#346 Critique P2 対応）。
// 全会場の単列全件表示は overview として縦量が過剰なため、
// 初期表示を先頭グループに限定し、group 単位で展開する（Desktop は2列で圧縮）。
import { useState } from "react";
import { TextLink } from "@/components/ui/TextLink";

// 初期表示する会場グループ数
const VISIBLE_GROUPS = 4;

export type TourOverviewGroup = {
  key: string;
  // 都道府県から作った「○○公演」。作れない場合は null（会場名を主表記にする）
  areaLabel: string | null;
  venueId: string | null;
  venueName: string | null;
  // 整形済みの日程行（例: "7/15(水) 開場 16:30 / 開演 18:00"）
  scheduleLines: string[];
};

type TourOverviewProps = {
  heading: string;
  groups: TourOverviewGroup[];
};

export function TourOverview({ heading, groups }: TourOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMore = groups.length > VISIBLE_GROUPS;
  const visibleGroups = isExpanded ? groups : groups.slice(0, VISIBLE_GROUPS);
  const restCount = groups.length - VISIBLE_GROUPS;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
      {/* Desktop は読み順（行優先）を保ったまま2列で圧縮する */}
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {visibleGroups.map((group) => (
          <div key={group.key}>
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              {group.areaLabel !== null ? (
                <>
                  <span className="font-medium text-foreground">
                    {group.areaLabel}
                  </span>
                  {group.venueId && group.venueName && (
                    <TextLink
                      href={`/venues/${group.venueId}`}
                      className="text-xs"
                    >
                      {group.venueName}
                    </TextLink>
                  )}
                </>
              ) : group.venueId && group.venueName ? (
                <TextLink
                  href={`/venues/${group.venueId}`}
                  className="text-sm font-medium"
                >
                  {group.venueName}
                </TextLink>
              ) : (
                <span className="text-foreground/50">会場未定</span>
              )}
            </p>
            <div className="mt-1 space-y-0.5 text-xs text-foreground/70">
              {group.scheduleLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5"
        >
          {isExpanded ? "折りたたむ" : `残り${restCount}会場を見る`}
        </button>
      )}
    </section>
  );
}
