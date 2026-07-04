import Link from "next/link";
import type { Live, LivePerformance, LiveType, SetlistItem } from "@/types/live";
import {
  LIVE_TYPE_LABELS,
  PERFORMANCE_STYLE_LABELS,
  SETLIST_ITEM_TYPE_LABELS,
} from "@/types/live";
import type { LiveAttendance } from "@/types/attendance";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AttendanceControl } from "@/components/lives/AttendanceControl";
import { formatMonthDayWithWeekday } from "@/lib/formatters";
import { formatMemberCountSummary } from "@/lib/memberCountSummary";

type LiveDetailProps = {
  live: Live;
  // ユーザー別データ（ADR 0009）。公演IDをキーに自分の参戦記録を持つ。未登録の公演は
  // キーが存在しない（page.tsx で Object.fromEntries した Map をそのまま渡す）。
  myAttendances: Record<string, LiveAttendance>;
};

// 種別ごとに時間ラベルを出し分ける（フェス=出演時刻、配信=配信時刻、開場は出さない）
function formatScheduleTime(
  liveType: LiveType,
  doorsOpenAt: string | null,
  startsAt: string | null
): string | null {
  if (liveType === "online") {
    return startsAt ? `配信 ${startsAt}` : null;
  }
  if (liveType === "festival") {
    return startsAt ? `出演 ${startsAt}` : null;
  }
  if (doorsOpenAt && startsAt) return `開場 ${doorsOpenAt} / 開演 ${startsAt}`;
  if (startsAt) return `開演 ${startsAt}`;
  if (doorsOpenAt) return `開場 ${doorsOpenAt}`;
  return null;
}

function formatScheduleLine(
  liveType: LiveType,
  performance: LivePerformance
): string {
  const date = performance.performanceDate
    ? formatMonthDayWithWeekday(performance.performanceDate)
    : "日付未定";
  const time = formatScheduleTime(
    liveType,
    performance.doorsOpenAt,
    performance.startsAt
  );
  return time ? `${date} ${time}` : date;
}

type VenueGroup = {
  venueId: string | null;
  venueName: string | null;
  venuePrefecture: string | null;
  performances: LivePerformance[];
};

// 公演を会場ごとにグループ化（初出順を維持）
function groupByVenue(performances: LivePerformance[]): VenueGroup[] {
  const groups: VenueGroup[] = [];
  const indexByKey = new Map<string, number>();
  for (const performance of performances) {
    const key = performance.venueId ?? "__none__";
    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, groups.length);
      groups.push({
        venueId: performance.venueId,
        venueName: performance.venueName,
        venuePrefecture: performance.venuePrefecture,
        performances: [performance],
      });
    } else {
      groups[existing].performances.push(performance);
    }
  }
  return groups;
}

// ツアー見出し用に都/府/県を除いた表記にする（北海道はそのまま、海外名はそのまま）
function performanceAreaLabel(prefecture: string): string {
  return `${prefecture.replace(/[都府県]$/, "")}公演`;
}

function setlistItemLabel(item: SetlistItem): string {
  if (item.itemType === "song") {
    return item.trackTitle ?? item.songTitle ?? "（曲名未設定）";
  }
  return SETLIST_ITEM_TYPE_LABELS[item.itemType];
}

function VenueLink({ performance }: { performance: LivePerformance }) {
  if (!performance.venueId || !performance.venueName) {
    return null;
  }
  return (
    <Link
      href={`/venues/${performance.venueId}`}
      className="text-blue-500 hover:underline"
    >
      {performance.venueName}
    </Link>
  );
}

export function LiveDetail({ live, myAttendances }: LiveDetailProps) {
  const venueGroups = groupByVenue(live.performances);
  // ツアー、または会場が複数ある場合は会場ごとのカードで表示する
  const useVenueGrid = live.liveType === "tour" || venueGroups.length > 1;

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

      {/* 事前情報: 会場・日程 */}
      {live.performances.length > 0 && (
        <section className="space-y-3">
          {useVenueGrid ? (
            <>
              <h2 className="text-center text-sm font-semibold tracking-widest text-foreground">
                公演・日程
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {venueGroups.map((group) => (
                  <div
                    key={group.venueId ?? "none"}
                    className="space-y-2 rounded-lg border border-foreground/10 p-4 text-center"
                  >
                    <p className="font-medium text-foreground">
                      {group.venuePrefecture
                        ? performanceAreaLabel(group.venuePrefecture)
                        : "公演"}
                    </p>
                    {group.venueId && group.venueName ? (
                      <Link
                        href={`/venues/${group.venueId}`}
                        className="block text-sm text-blue-500 hover:underline"
                      >
                        {group.venueName}
                      </Link>
                    ) : (
                      <p className="text-sm text-foreground/50">会場未定</p>
                    )}
                    <div className="space-y-0.5 text-xs text-foreground/70">
                      {group.performances.map((performance) => (
                        <p key={performance.id}>
                          {formatScheduleLine(live.liveType, performance)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2 text-center">
              <h2 className="text-sm font-semibold tracking-widest text-foreground">
                会場・日程
              </h2>
              {venueGroups[0]?.venueId && venueGroups[0]?.venueName && (
                <Link
                  href={`/venues/${venueGroups[0].venueId}`}
                  className="block text-foreground hover:underline"
                >
                  {venueGroups[0].venueName}
                </Link>
              )}
              <div className="space-y-0.5 text-sm text-foreground/70">
                {live.performances.map((performance) => (
                  <p key={performance.id}>
                    {formatScheduleLine(live.liveType, performance)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {live.performerMembers.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">出演メンバー</h2>
            <span className="text-xs text-foreground/60">
              {formatMemberCountSummary(
                live.performerMembers.map((member) => member.generation)
              )}
            </span>
          </div>
          <p className="text-sm text-foreground/80">
            {live.performerMembers
              .map((member) => member.memberNameJa)
              .join(" / ")}
          </p>
        </section>
      )}

      {/* 当日情報: 1日ごとのカードを横スライド */}
      {live.performances.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">公演ごとの情報</h2>
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
            {live.performances.map((performance) => (
              <div
                key={performance.id}
                className="w-[85%] shrink-0 snap-start space-y-2 rounded-lg border border-foreground/10 p-4 sm:w-80"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    {performance.performanceDate
                      ? formatMonthDayWithWeekday(performance.performanceDate)
                      : "日付未定"}
                  </span>
                  <VenueLink performance={performance} />
                </div>

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

                <AttendanceControl
                  performanceId={performance.id}
                  attendance={myAttendances[performance.id] ?? null}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
