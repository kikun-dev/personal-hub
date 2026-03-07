"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatMonthLabel } from "@/lib/formatters";

type MonthSelectorProps = {
  year: number;
  month: number;
  basePath?: string;
};

export function MonthSelector({
  year,
  month,
  basePath = "/dashboard",
}: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = (newYear: number, newMonth: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(newYear));
    params.set("month", String(newMonth));
    router.push(`${basePath}?${params.toString()}`);
  };

  const isAtMin = year === 2000 && month === 1;
  const isAtMax = year === 2100 && month === 12;

  const handlePrev = () => {
    if (isAtMin) return;
    if (month === 1) {
      navigate(year - 1, 12);
    } else {
      navigate(year, month - 1);
    }
  };

  const handleNext = () => {
    if (isAtMax) return;
    if (month === 12) {
      navigate(year + 1, 1);
    } else {
      navigate(year, month + 1);
    }
  };

  return (
    <div className="flex items-center gap-4">
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
