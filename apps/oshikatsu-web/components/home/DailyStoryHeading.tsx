"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { focusRingClass } from "@/components/ui/focusRing";
import { consumeCalendarNavigation } from "@/lib/calendarResultFocus";

type DailyStoryHeadingProps = {
  selectedDateStr: string;
  className: string;
  children: ReactNode;
};

// カレンダーのdate選択からのnavigationの場合のみ、この見出しへfocusを移す
// （#358 result feedback contract）。month browseや直接URL遷移では発火しない。
export function DailyStoryHeading({
  selectedDateStr,
  className,
  children,
}: DailyStoryHeadingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (consumeCalendarNavigation(selectedDateStr)) {
      headingRef.current?.focus();
    }
  }, [selectedDateStr]);

  return (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className={`${className} ${focusRingClass}`}
    >
      {children}
    </h1>
  );
}
