import { Suspense } from "react";
import Link from "next/link";
import { EventCalendar } from "@/components/events/EventCalendar";
import { MonthSelector } from "@/components/events/MonthSelector";
import { DailyStoryHeading } from "@/components/home/DailyStoryHeading";
import { ReturnToCalendarLink } from "@/components/home/ReturnToCalendarLink";
import { NextEvents } from "@/components/top/NextEvents";
import { PastSameDay } from "@/components/top/PastSameDay";
import { RecentAttendance } from "@/components/top/RecentAttendance";
import { DaySchedule } from "@/components/top/DaySchedule";
import { focusRingClass } from "@/components/ui/focusRing";
import {
  getTodayInAppTimeZone,
  parseCalendarDateParams,
} from "@/lib/dateParams";
import { formatMonthDayKanjiWithWeekday } from "@/lib/formatters";
import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getRecentAttendance } from "@/usecases/getRecentAttendance";
import { getTopPageData } from "@/usecases/readOrbitMusicData";

type TopPageProps = {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export default async function TopPage({ searchParams }: TopPageProps) {
  const params = await searchParams;
  const now = getTodayInAppTimeZone();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();
  const todayDateStr = `${todayYear}-${pad(todayMonth)}-${pad(todayDay)}`;

  const { year, month, day } = parseCalendarDateParams(params, now);
  const selectedDateStr = `${year}-${pad(month)}-${pad(day)}`;
  const isSelectedToday = selectedDateStr === todayDateStr;
  const pastSameDayTitle = isSelectedToday
    ? "過去の今日"
    : `過去の${month}月${day}日`;
  // URLへdayが明示されている場合のみ「カレンダーへ戻る」導線を出す（today表示でも同様）。
  const hasDayParam = params.day !== undefined;

  // global shared read（getTopPageData）と personal auth chain（requireOrbitUser →
  // 参加記録取得）を同じ page phase で並列開始する（#366）。personal chain 内の
  // auth → attendance の順序自体は維持し、global 側とのみ並列化する。
  const topPageDataPromise = getTopPageData(
    year,
    month,
    day,
    todayYear,
    todayMonth,
    todayDay
  );
  // requireOrbitUser が未認証時に redirect（NEXT_REDIRECT throw）した場合、
  // 並列開始した global promise が reject しても誰も await しない unhandled rejection に
  // ならないよう no-op catch を付ける（本流は下の await topPageDataPromise で処理する）。
  topPageDataPromise.catch(() => undefined);

  // 参加記録は本人限定データ（ADR 0009）のため、グローバルデータの shared read
  // cache 経路（readOrbitMusicData.ts）ではなく、mypage と同じ認証付き入口から
  // 直接取得する（キャッシュ・認可方針を変えない）。
  const { supabase } = await requireOrbitUser();
  const attendanceRepo = createAttendanceRepository(supabase);
  const recentAttendance = await getRecentAttendance(attendanceRepo);

  const {
    monthEvents,
    selectedDateEvents,
    onThisDayEvents,
    todayEvents,
    nextEvents,
  } = await topPageDataPromise;

  // 見出しの件数表示とDayScheduleへ渡すeventsで同じ選択ロジックを共有する（#399）。
  const displayedEvents = isSelectedToday ? todayEvents : selectedDateEvents;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-8">
        <section className="space-y-5">
          {/* タイトル階層をprototype準拠に統一する（#399）: 小さなeyebrow + 主見出しh1=日付。
              ブロック下端に区切り線を置き、後続の「今日の予定」との区画を明示する。 */}
          {isSelectedToday ? (
            <div className="border-b border-border-subtle pb-4">
              <p className="text-xs font-medium text-foreground-secondary">
                今日のSakalog
              </p>
              <DailyStoryHeading
                selectedDateStr={selectedDateStr}
                className="mt-1 text-xl font-bold text-foreground"
              >
                {formatMonthDayKanjiWithWeekday(todayDateStr)}
              </DailyStoryHeading>
              {hasDayParam && (
                <p className="mt-2">
                  <ReturnToCalendarLink />
                </p>
              )}
            </div>
          ) : (
            <div className="border-b border-border-subtle pb-4">
              <p className="text-xs font-medium text-foreground-secondary">
                選んだ日のSakalog
              </p>
              <DailyStoryHeading
                selectedDateStr={selectedDateStr}
                className="mt-1 text-xl font-bold text-foreground"
              >
                {year}年{formatMonthDayKanjiWithWeekday(selectedDateStr)}
              </DailyStoryHeading>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Link
                  href="/"
                  className="text-sm text-foreground-secondary hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  ← 今日へ戻る
                </Link>
                {hasDayParam && (
                  <ReturnToCalendarLink />
                )}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="flex items-baseline justify-between text-sm font-semibold text-foreground">
              {isSelectedToday ? "今日の予定" : `${month}月${day}日の予定`}
              <span className="text-xs font-normal text-foreground-secondary">
                {displayedEvents.length > 0 ? `${displayedEvents.length}件` : "なし"}
              </span>
            </h2>
            {/* key: 日付変更時に再マウントし、展開状態が別日の文脈へ残らないよう初期化する */}
            <DaySchedule
              key={selectedDateStr}
              events={displayedEvents}
              emptyMessage={
                isSelectedToday
                  ? "今日の予定はありません"
                  : `${month}月${day}日の予定はありません`
              }
            />
          </div>
        </section>

        {/* Mobile: 過去の同日 → 次のイベント → 最近の参加記録 の縦積み。
            Desktop(lg): NextEvents は rail 側にあるため隠し、過去の同日(広) + 参加記録(狭) の横並び。
            display:none はグリッドフローから外れるため単一 DOM で両順序を満たせる（#345）。 */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-6">
          {/* key: DaySchedule と同様、日付変更時に展開状態を初期化する */}
          <PastSameDay
            key={selectedDateStr}
            events={onThisDayEvents}
            title={pastSameDayTitle}
            currentYear={year}
          />
          <div className="lg:hidden">
            <NextEvents events={nextEvents} today={now} frame="plain" />
          </div>
          <RecentAttendance overview={recentAttendance} />
        </div>

        <section className="space-y-6">
          {/* 戻り導線からのprogrammatic focusを受けるためtabIndex={-1}にする */}
          <h2
            id="calendar"
            tabIndex={-1}
            className={`text-sm font-semibold text-foreground ${focusRingClass}`}
          >
            日付から探す
          </h2>

          <div className="flex items-center">
            <Suspense fallback={<div className="h-10" />}>
              <MonthSelector
                year={year}
                month={month}
                day={day}
                showTodayButton
                splitTodayButton
              />
            </Suspense>
          </div>

          <EventCalendar
            events={monthEvents}
            year={year}
            month={month}
            selectedDateStr={selectedDateStr}
          />
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6">
          <NextEvents events={nextEvents} today={now} />
        </div>
      </aside>
    </div>
  );
}
