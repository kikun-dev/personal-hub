"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatMonthLabel } from "@/lib/formatters";

type MonthSelectorProps = {
  year: number;
  month: number;
};

export function MonthSelector({ year, month }: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = (newYear: number, newMonth: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(newYear));
    params.set("month", String(newMonth));
    router.push(`/dashboard?${params.toString()}`);
  };

  const handlePrev = () => {
    if (month === 1) {
      navigate(year - 1, 12);
    } else {
      navigate(year, month - 1);
    }
  };

  const handleNext = () => {
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
        className="rounded-md px-3 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        ← 前月
      </button>
      <span className="min-w-[8rem] text-center text-lg font-bold text-foreground">
        {formatMonthLabel(year, month)}
      </span>
      <button
        onClick={handleNext}
        className="rounded-md px-3 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        翌月 →
      </button>
    </div>
  );
}
