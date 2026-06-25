import Link from "next/link";
import type { Live, SetlistItem } from "@/types/live";
import {
  LIVE_TYPE_LABELS,
  PERFORMANCE_STYLE_LABELS,
  SETLIST_ITEM_TYPE_LABELS,
} from "@/types/live";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { formatDate } from "@/lib/formatters";

type LiveDetailProps = {
  live: Live;
};

function formatTimeRange(
  doorsOpenAt: string | null,
  startsAt: string | null
): string | null {
  if (doorsOpenAt && startsAt) return `開場 ${doorsOpenAt} / 開演 ${startsAt}`;
  if (startsAt) return `開演 ${startsAt}`;
  if (doorsOpenAt) return `開場 ${doorsOpenAt}`;
  return null;
}

function setlistItemLabel(item: SetlistItem): string {
  if (item.itemType === "song") {
    return item.trackTitle ?? item.songTitle ?? "（曲名未設定）";
  }
  return SETLIST_ITEM_TYPE_LABELS[item.itemType];
}

export function LiveDetail({ live }: LiveDetailProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs text-foreground/50">{LIVE_TYPE_LABELS[live.liveType]}</p>
        <h1 className="text-xl font-bold text-foreground">{live.name}</h1>
        {live.performerGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {live.performerGroups.map((group) => (
              <GroupBadge
                key={group.groupId}
                groupName={group.groupNameJa}
                groupColor={group.groupColor}
              />
            ))}
          </div>
        )}
      </div>

      {live.description && (
        <p className="whitespace-pre-wrap text-sm text-foreground/80">
          {live.description}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">公演</h2>
        {live.performances.length === 0 ? (
          <p className="text-sm text-foreground/50">公演が登録されていません</p>
        ) : (
          <div className="space-y-3">
            {live.performances.map((performance) => {
              const timeRange = formatTimeRange(
                performance.doorsOpenAt,
                performance.startsAt
              );
              return (
                <div
                  key={performance.id}
                  className="space-y-2 rounded-lg border border-foreground/10 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {performance.performanceDate
                        ? formatDate(performance.performanceDate)
                        : "日付未定"}
                    </span>
                    {performance.sessionLabel && (
                      <span className="text-foreground/60">
                        {performance.sessionLabel}
                      </span>
                    )}
                    {performance.venueId && performance.venueName && (
                      <Link
                        href={`/venues/${performance.venueId}`}
                        className="text-blue-500 hover:underline"
                      >
                        {performance.venueName}
                      </Link>
                    )}
                  </div>

                  {timeRange && (
                    <p className="text-xs text-foreground/60">{timeRange}</p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {performance.hasStreaming && (
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-foreground">
                        配信あり
                      </span>
                    )}
                    {performance.hasLiveViewing && (
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-foreground">
                        ライブビューイング
                      </span>
                    )}
                  </div>

                  {performance.ticketInfo && (
                    <p className="whitespace-pre-wrap text-xs text-foreground/70">
                      チケット: {performance.ticketInfo}
                    </p>
                  )}
                  {performance.seatInfo && (
                    <p className="whitespace-pre-wrap text-xs text-foreground/70">
                      座席: {performance.seatInfo}
                    </p>
                  )}

                  {performance.absences.length > 0 && (
                    <p className="text-xs text-foreground/70">
                      休演:{" "}
                      {performance.absences
                        .map((absence) =>
                          absence.note
                            ? `${absence.memberNameJa}（${absence.note}）`
                            : absence.memberNameJa
                        )
                        .join("、")}
                    </p>
                  )}

                  {performance.setlistItems.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground/70">
                        セットリスト
                      </p>
                      <ol className="space-y-0.5">
                        {performance.setlistItems.map((item, index) => (
                          <li
                            key={`${performance.id}-${index}`}
                            className="flex gap-2 text-xs text-foreground/80"
                          >
                            <span className="w-5 shrink-0 text-right text-foreground/40">
                              {item.itemType === "song" ? index + 1 : "-"}
                            </span>
                            {item.itemType === "song" ? (
                              <span>
                                {setlistItemLabel(item)}
                                {item.performanceStyle && (
                                  <span className="ml-1 rounded bg-foreground/10 px-1 text-[10px] text-foreground/60">
                                    {PERFORMANCE_STYLE_LABELS[item.performanceStyle]}
                                  </span>
                                )}
                                {item.note ? `（${item.note}）` : ""}
                                {item.members.length > 0 && (
                                  <span className="ml-1 text-foreground/50">
                                    {" / "}
                                    {item.members
                                      .map((member) =>
                                        member.isCenter
                                          ? `${member.memberNameJa}（C）`
                                          : member.memberNameJa
                                      )
                                      .join("、")}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span>
                                <span className="mr-1 rounded bg-foreground/10 px-1 text-foreground/60">
                                  {SETLIST_ITEM_TYPE_LABELS[item.itemType]}
                                </span>
                                {item.note}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
