import Link from "next/link";
import type { Live, LivePerformance, LiveType, SetlistItem } from "@/types/live";
import { LIVE_TYPE_LABELS } from "@/types/live";
import type { LiveAttendance } from "@/types/attendance";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AttendanceControl } from "@/components/lives/AttendanceControl";
import { TourOverview } from "@/components/lives/TourOverview";
import { TextLink } from "@/components/ui/TextLink";
import { LINK_FOCUS_CLASS } from "@/components/ui/PendingLink";
import { formatMonthDayWithWeekday } from "@/lib/formatters";
import { formatMemberCountSummary } from "@/lib/memberCountSummary";
import { numberSetlistItems } from "@/usecases/setlistNumbering";
import {
  topPageDateHref,
  monthDayLabel,
  type LiveDateContext,
} from "@/lib/liveDateContext";
import { findNextPerformance } from "@/usecases/performanceChronology";

type LiveDetailProps = {
  live: Live;
  // ユーザー別データ（ADR 0009）。公演IDをキーに自分の参戦記録を持つ。未登録の公演は
  // キーが存在しない（page.tsx で Object.fromEntries した Map をそのまま渡す）。
  myAttendances: Record<string, LiveAttendance>;
  // 日付+公演 context（#346）。トップの選択日から遷移した場合のみ検証済み
  // { date, performanceId }、それ以外（直接訪問・不正値・対象ライブの公演と不一致）は null。
  context: LiveDateContext | null;
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

// #262: 簡易表示は楽曲のみ描画するため、曲名の解決だけを担う（非楽曲ラベルは持たない）
function songTitleLabel(item: SetlistItem): string {
  return item.trackTitle ?? item.songTitle ?? "（曲名未設定）";
}

function VenueLink({ performance }: { performance: LivePerformance }) {
  if (!performance.venueId || !performance.venueName) {
    return null;
  }
  return (
    <TextLink href={`/venues/${performance.venueId}`}>
      {performance.venueName}
    </TextLink>
  );
}

// #262: ライブ詳細のセトリ簡易表示。楽曲のみを「番号 曲名 C:センター」で出す。
// 非楽曲（MC等）は簡易表示では省き、詳細はセトリ詳細画面（#261）で参照する。
// 番号は numberSetlistItems を全件に対して算出してから楽曲だけ描画するため、
// 本編 1,2… / EN1… / WEN1… / TEN1… のセクション番号はそのまま維持される。
function PerformanceSetlistSummary({
  performance,
}: {
  performance: LivePerformance;
}) {
  const songs = numberSetlistItems(performance.setlistItems).filter(
    ({ item }) => item.itemType === "song"
  );
  if (songs.length === 0) {
    return null;
  }
  return (
    <ol className="space-y-0.5">
      {songs.map(({ item, numberLabel }, index) => {
        const centers = item.members.filter((member) => member.isCenter);
        return (
          <li
            key={`${performance.id}-${index}`}
            className="flex gap-2 text-xs text-foreground-secondary"
          >
            <span className="w-5 shrink-0 text-right text-foreground-secondary">
              {numberLabel}
            </span>
            <span>
              {songTitleLabel(item)}
              {centers.length > 0 && (
                <span className="ml-1 text-foreground-secondary">
                  C:{centers.map((member) => member.memberNameJa).join("・")}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PerformanceCard({
  live,
  performance,
  attendance,
  className,
}: {
  live: Live;
  performance: LivePerformance;
  attendance: LiveAttendance | null;
  className?: string;
}) {
  return (
    <div className={`space-y-2 rounded-lg border border-border-subtle p-4 ${className ?? ""}`}>
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
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-foreground">
            配信あり
          </span>
        )}
        {performance.hasLiveViewing && (
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-foreground">
            ライブビューイング
          </span>
        )}
      </div>

      {performance.absences.length > 0 && (
        <p className="text-xs text-foreground-secondary">
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

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-foreground-secondary">セットリスト</p>
          {/* #261: セトリ詳細の参照ビューへの導線。セトリ0件でも空状態の
              参照ページへ辿れるよう、導線は常に表示する（レビュー指摘）。
              既存のセトリ表示自体は変更しない（簡素化は#262） */}
          <TextLink
            href={`/lives/${live.id}/performances/${performance.id}/setlist`}
            className="text-xs"
          >
            詳細を見る →
          </TextLink>
        </div>
        {/* #262: セトリ簡易表示は楽曲のみ。非楽曲（MC等）は省き、
            詳細はセトリ詳細画面（#261）で見る */}
        <PerformanceSetlistSummary performance={performance} />
      </div>

      <AttendanceControl performanceId={performance.id} attendance={attendance} />
    </div>
  );
}

export function LiveDetail({ live, myAttendances, context }: LiveDetailProps) {
  const venueGroups = groupByVenue(live.performances);
  // ツアー、または会場が複数ある場合は会場ごとのカードで表示する
  const useVenueGrid = live.liveType === "tour" || venueGroups.length > 1;

  // 有効 context の対象公演・次の公演（#346）。
  const targetPerformance =
    context !== null
      ? live.performances.find((p) => p.id === context.performanceId) ?? null
      : null;
  const nextPerformance =
    targetPerformance !== null
      ? findNextPerformance(live.performances, targetPerformance)
      : null;
  const targetHasSetlistSongs =
    targetPerformance !== null &&
    numberSetlistItems(targetPerformance.setlistItems).some(
      ({ item }) => item.itemType === "song"
    );

  const scheduleSection = (
      /* 事前情報: 会場・日程 */
      live.performances.length > 0 && (
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
                    className="space-y-2 rounded-lg border border-border-subtle p-4 text-center"
                  >
                    <p className="font-medium text-foreground">
                      {group.venuePrefecture
                        ? performanceAreaLabel(group.venuePrefecture)
                        : "公演"}
                    </p>
                    {group.venueId && group.venueName ? (
                      <TextLink
                        href={`/venues/${group.venueId}`}
                        className="block text-sm"
                      >
                        {group.venueName}
                      </TextLink>
                    ) : (
                      <p className="text-sm text-foreground-secondary">会場未定</p>
                    )}
                    <div className="space-y-0.5 text-xs text-foreground-secondary">
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
                <TextLink
                  data-ui="single-venue-link"
                  href={`/venues/${venueGroups[0].venueId}`}
                  className="block"
                >
                  {venueGroups[0].venueName}
                </TextLink>
              )}
              <div className="space-y-0.5 text-sm text-foreground-secondary">
                {live.performances.map((performance) => (
                  <p key={performance.id}>
                    {formatScheduleLine(live.liveType, performance)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )
  );

  const membersSection = (
      live.performerMembers.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">出演メンバー</h2>
            <span className="text-xs text-foreground-secondary">
              {formatMemberCountSummary(
                live.performerMembers.map((member) => member.generation)
              )}
            </span>
          </div>
          <p className="text-sm text-foreground-secondary">
            {live.performerMembers
              .map((member) => member.memberNameJa)
              .join(" / ")}
          </p>
        </section>
      )
  );

  const performancesSection = (
      /* 当日情報: 1日ごとのカードを横スライド */
      live.performances.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">公演ごとの情報</h2>
          <div
            data-testid="live-performance-carousel"
            className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [contain:paint]"
          >
            {live.performances.map((performance) => (
              <PerformanceCard
                key={performance.id}
                className="w-[85%] shrink-0 snap-start sm:w-80"
                live={live}
                performance={performance}
                attendance={myAttendances[performance.id] ?? null}
              />
            ))}
          </div>
        </section>
      )
  );

  const targetArea = targetPerformance?.venuePrefecture
    ? performanceAreaLabel(targetPerformance.venuePrefecture)
    : null;
  const targetTime = targetPerformance
    ? formatScheduleTime(
        live.liveType,
        targetPerformance.doorsOpenAt,
        targetPerformance.startsAt
      )
    : null;
  const targetDateLabel = targetPerformance?.performanceDate
    ? formatMonthDayWithWeekday(targetPerformance.performanceDate)
    : "日付未定";

  const thisPerformanceSection = targetPerformance !== null && (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">この公演</h2>
      {/* 選択状態は色ではなく中立の境界強度（/25）で表現する（Meaningful Color Rule）。
          影は使わない（Earned Lift / One Edge Rule）。 */}
      <div className="space-y-3 rounded-lg border border-border-strong bg-background p-4">
        <div className="space-y-1">
          {/* 主役行: 都道府県から意味のある「○○公演」を作れる場合のみ使用し、
              作れない場合は会場名、それも無ければ日付+時刻を主役行にする
              （表示のために存在しない公演名を推測・生成しない）。 */}
          {targetArea !== null ? (
            <>
              <p className="text-sm text-foreground-secondary">
                {targetDateLabel}
                {targetTime !== null && <span className="ml-2">{targetTime}</span>}
              </p>
              <p className="text-base font-semibold text-foreground">
                {targetArea}
              </p>
              <VenueLink performance={targetPerformance} />
            </>
          ) : targetPerformance.venueId && targetPerformance.venueName ? (
            <>
              <p className="text-sm text-foreground-secondary">
                {targetDateLabel}
                {targetTime !== null && <span className="ml-2">{targetTime}</span>}
              </p>
              <TextLink
                href={`/venues/${targetPerformance.venueId}`}
                className="text-base font-semibold"
              >
                {targetPerformance.venueName}
              </TextLink>
            </>
          ) : (
            <p className="text-base font-semibold text-foreground">
              {targetDateLabel}
              {targetTime !== null && (
                <span className="ml-2 text-sm font-normal text-foreground-secondary">
                  {targetTime}
                </span>
              )}
            </p>
          )}
        </div>

        {(targetPerformance.hasStreaming || targetPerformance.hasLiveViewing) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {targetPerformance.hasStreaming && (
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-foreground">
                配信あり
              </span>
            )}
            {targetPerformance.hasLiveViewing && (
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-foreground">
                ライブビューイング
              </span>
            )}
          </div>
        )}

        {targetPerformance.absences.length > 0 && (
          <p className="text-xs text-foreground-secondary">
            休演:{" "}
            {targetPerformance.absences
              .map((absence) =>
                absence.note
                  ? `${absence.memberNameJa}（${absence.note}）`
                  : absence.memberNameJa
              )
              .join("、")}
          </p>
        )}

        {/* セットリストは存在する場合のみ描画する（未来公演では無いのが自然で、
            「未登録」表示は管理状態に見えるため section ごと出さない）。
            fallback の carousel は #261 の決定（0件でも導線常時表示）のまま変更しない。 */}
        {targetHasSetlistSongs && (
          <div className="space-y-1 border-t border-border-subtle pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium text-foreground-secondary">セットリスト</p>
              <TextLink
                href={`/lives/${live.id}/performances/${targetPerformance.id}/setlist`}
                className="text-xs"
              >
                詳細を見る →
              </TextLink>
            </div>
            <PerformanceSetlistSummary performance={targetPerformance} />
          </div>
        )}

        <AttendanceControl
          performanceId={targetPerformance.id}
          attendance={myAttendances[targetPerformance.id] ?? null}
        />
      </div>
    </section>
  );

  const nextArea = nextPerformance?.venuePrefecture
    ? performanceAreaLabel(nextPerformance.venuePrefecture)
    : null;
  const nextTime = nextPerformance
    ? formatScheduleTime(live.liveType, nextPerformance.doorsOpenAt, nextPerformance.startsAt)
    : null;

  const nextPerformanceSection = nextPerformance !== null && (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">次の公演</h2>
      {/* secondary surface: この公演より薄い境界と密な padding。
          「あとN日」は表示しない（次の公演は選択公演基準の相対時間軸のため。#346 Decision） */}
      <div className="space-y-1 rounded-lg border border-border-subtle p-3 text-sm">
        <p>
          <span className="font-medium text-foreground">
            {nextPerformance.performanceDate
              ? formatMonthDayWithWeekday(nextPerformance.performanceDate)
              : "日付未定"}
          </span>
          {nextTime !== null && (
            <span className="ml-2 text-foreground-secondary">{nextTime}</span>
          )}
        </p>
        {(nextArea !== null || nextPerformance.venueName) && (
          <p className="flex flex-wrap items-baseline gap-x-2">
            {nextArea !== null && (
              <span className="text-foreground">{nextArea}</span>
            )}
            <VenueLink performance={nextPerformance} />
          </p>
        )}
      </div>
    </section>
  );

  const descriptionBlock = live.description && (
    <p className="whitespace-pre-wrap text-sm text-foreground-secondary">
      {live.description}
    </p>
  );

  // context 時のツアー全体 overview（#346）: 静かな行リスト + group 単位の展開。
  const quietScheduleSection = live.performances.length > 0 && (
    <TourOverview
      heading={useVenueGrid ? "公演・日程" : "会場・日程"}
      groups={venueGroups.map((group) => ({
        key: group.venueId ?? "none",
        areaLabel: group.venuePrefecture
          ? performanceAreaLabel(group.venuePrefecture)
          : null,
        venueId: group.venueId,
        venueName: group.venueName,
        scheduleLines: group.performances.map((performance) =>
          formatScheduleLine(live.liveType, performance)
        ),
      }))}
    />
  );

  return (
    <div className="space-y-6">
      {/* 閲覧文脈の戻り導線（#346）: 有効 context では元の選択日へ、
          直接訪問・invalid context では ライブ一覧へ戻す。日付や該当公演を推測しない。 */}
      <p>
        {context !== null && targetPerformance !== null ? (
          <Link
            href={topPageDateHref(context.date)}
            className={`text-sm text-foreground-secondary hover:text-foreground hover:underline ${LINK_FOCUS_CLASS}`}
          >
            ← {monthDayLabel(context.date)}の出来事へ戻る
          </Link>
        ) : (
          <Link
            href="/lives"
            className={`text-sm text-foreground-secondary hover:text-foreground hover:underline ${LINK_FOCUS_CLASS}`}
          >
            ← ライブ一覧へ戻る
          </Link>
        )}
      </p>

      <div className="space-y-2">
        <p className="text-xs text-foreground-secondary">{LIVE_TYPE_LABELS[live.liveType]}</p>
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

      {/* 有効 context（#346）: この公演 → 次の公演 → ツアー全体 → メンバー。
          全公演のセトリ付き横スライドは表示しない。fallback は従来 UI を維持。 */}
      {context !== null && targetPerformance !== null ? (
        <>
          {thisPerformanceSection}
          {nextPerformanceSection}
          {/* Critique P3: 長文 description が primary surface（この公演/次の公演）の
              先頭着地を押し下げないよう、有効 context 時はツアー全体説明としてここへ下げる。
              タイトルと GroupBadge は上に維持する。 */}
          {descriptionBlock}
          {quietScheduleSection}
          {membersSection}
        </>
      ) : (
        <>
          {descriptionBlock}
          {scheduleSection}
          {membersSection}
          {performancesSection}
        </>
      )}
    </div>
  );
}
