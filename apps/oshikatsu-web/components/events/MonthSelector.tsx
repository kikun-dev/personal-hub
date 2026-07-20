"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatMonthLabel } from "@/lib/formatters";
import { getDaysInMonth } from "@/lib/dateParams";

type MonthSelectorProps = {
  year: number;
  month: number;
  day?: number;
  basePath?: string;
};

export function MonthSelector({
  year,
  month,
  day,
  basePath = "/",
}: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // day を使う画面（トップ）と使わない画面（管理）を同一コンポーネントで扱う。
  const hasDayContext = searchParams.has("day") || day !== undefined;
  // 月変更のannouncement（#358 Decision）。初期mountでは通知しないため空文字始まり。
  const [announcement, setAnnouncement] = useState("");

  const navigate = (newYear: number, newMonth: number, newDay?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(newYear));
    params.set("month", String(newMonth));
    if (hasDayContext && newDay !== undefined) {
      params.set("day", String(newDay));
    } else {
      params.delete("day");
    }
    router.push(`${basePath}?${params.toString()}`);
  };

  const announceNavigation = (
    targetYear: number,
    targetMonth: number,
    targetDay?: number
  ) => {
    const monthPart = `${targetYear}年${targetMonth}月`;
    setAnnouncement(
      hasDayContext && targetDay !== undefined
        ? `${monthPart}、${targetDay}日を選択中`
        : monthPart
    );
  };

  const clampDay = (targetYear: number, targetMonth: number, targetDay: number) => {
    const lastDay = getDaysInMonth(targetYear, targetMonth);
    return Math.min(Math.max(targetDay, 1), lastDay);
  };

  const currentDay = (() => {
    const dayParam = searchParams.get("day");
    if (dayParam !== null) {
      const rawDay = Number(dayParam);
      if (Number.isInteger(rawDay)) return rawDay;
    }
    return day ?? 1;
  })();

  const isAtMin = year === 2000 && month === 1;
  const isAtMax = year === 2100 && month === 12;

  const handlePrev = () => {
    if (isAtMin) return;
    if (month === 1) {
      const targetDay = hasDayContext ? clampDay(year - 1, 12, currentDay) : undefined;
      navigate(year - 1, 12, targetDay);
      announceNavigation(year - 1, 12, targetDay);
    } else {
      const targetDay = hasDayContext ? clampDay(year, month - 1, currentDay) : undefined;
      navigate(year, month - 1, targetDay);
      announceNavigation(year, month - 1, targetDay);
    }
  };

  const handleNext = () => {
    if (isAtMax) return;
    if (month === 12) {
      const targetDay = hasDayContext ? clampDay(year + 1, 1, currentDay) : undefined;
      navigate(year + 1, 1, targetDay);
      announceNavigation(year + 1, 1, targetDay);
    } else {
      const targetDay = hasDayContext ? clampDay(year, month + 1, currentDay) : undefined;
      navigate(year, month + 1, targetDay);
      announceNavigation(year, month + 1, targetDay);
    }
  };

  // 前月 / 翌月 は320pxで40px、390px以上で44pxのhit areaを持つ
  // （24pxのvisual circleとは無関係にbutton自体の当たり判定として確保する）。
  const prevButton = (
    <button
      onClick={handlePrev}
      aria-disabled={isAtMin || undefined}
      className="inline-flex min-h-10 min-[390px]:min-h-11 items-center justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-transparent aria-disabled:hover:text-foreground-secondary sm:px-3"
    >
      ← 前月
    </button>
  );

  const nextButton = (
    <button
      onClick={handleNext}
      aria-disabled={isAtMax || undefined}
      className="inline-flex min-h-10 min-[390px]:min-h-11 items-center justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-transparent aria-disabled:hover:text-foreground-secondary sm:px-3"
    >
      翌月 →
    </button>
  );

  // sm未満: 2行構成（1行目: 月label、2行目: 前月/翌月）。
  // whitespace-nowrapのlabelを1行目に置き、2行目はbutton間隔を広く取ることで
  // 320/390pxでのoverflowとタップ誤操作を避ける。
  const mobileLayout = (
    <div className="flex w-full flex-col gap-2 sm:hidden">
      <span className="whitespace-nowrap text-center text-lg font-bold text-foreground">
        {formatMonthLabel(year, month)}
      </span>
      <div className="flex items-center justify-between gap-2">
        {prevButton}
        {nextButton}
      </div>
    </div>
  );

  const monthLabel = (
    <span className="min-w-[6rem] whitespace-nowrap text-center text-lg font-bold text-foreground sm:min-w-[8rem]">
      {formatMonthLabel(year, month)}
    </span>
  );

  const statusAnnouncement = (
    <p role="status" className="sr-only">
      {announcement}
    </p>
  );

  return (
    <>
      {mobileLayout}
      <div className="hidden items-center gap-2 sm:flex sm:gap-4">
        {prevButton}
        {monthLabel}
        {nextButton}
      </div>
      {statusAnnouncement}
    </>
  );
}
