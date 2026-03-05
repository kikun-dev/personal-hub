"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatMonthLabel } from "@/lib/formatters";
import { getDaysInMonth } from "@/lib/dateParams";

type MonthSelectorProps = {
  year: number;
  month: number;
  day?: number;
  basePath?: string;
  showTodayButton?: boolean;
};

export function MonthSelector({
  year,
  month,
  day,
  basePath = "/",
  showTodayButton = false,
}: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // day を使う画面（トップ）と使わない画面（管理）を同一コンポーネントで扱う。
  const hasDayContext = searchParams.has("day") || day !== undefined;

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
      navigate(
        year - 1,
        12,
        hasDayContext ? clampDay(year - 1, 12, currentDay) : undefined
      );
    } else {
      navigate(
        year,
        month - 1,
        hasDayContext ? clampDay(year, month - 1, currentDay) : undefined
      );
    }
  };

  const handleNext = () => {
    if (isAtMax) return;
    if (month === 12) {
      navigate(
        year + 1,
        1,
        hasDayContext ? clampDay(year + 1, 1, currentDay) : undefined
      );
    } else {
      navigate(
        year,
        month + 1,
        hasDayContext ? clampDay(year, month + 1, currentDay) : undefined
      );
    }
  };

  const handleToday = () => {
    const now = new Date();
    navigate(
      now.getFullYear(),
      now.getMonth() + 1,
      hasDayContext ? now.getDate() : undefined
    );
  };

  return (
    <div className="flex items-center gap-4">
      {showTodayButton && (
        <button
          onClick={handleToday}
          className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          Today
        </button>
      )}
      <button
        onClick={handlePrev}
        disabled={isAtMin}
        className="rounded-md px-3 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        ← 前月
      </button>
      <span className="min-w-[8rem] text-center text-lg font-bold text-foreground">
        {formatMonthLabel(year, month)}
      </span>
      <button
        onClick={handleNext}
        disabled={isAtMax}
        className="rounded-md px-3 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        翌月 →
      </button>
    </div>
  );
}
