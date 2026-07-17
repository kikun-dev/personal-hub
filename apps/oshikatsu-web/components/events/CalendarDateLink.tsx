"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { markCalendarNavigation } from "@/lib/calendarResultFocus";

type CalendarDateLinkProps = {
  href: string;
  dateStr: string;
  ariaLabel: string;
  ariaCurrent?: "date";
  className: string;
  children: ReactNode;
};

// date選択によるnavigationであることをsessionStorageへ記録するclient leaf。
// navigation自体はnext/link Linkのデフォルト挙動に任せる。
export function CalendarDateLink({
  href,
  dateStr,
  ariaLabel,
  ariaCurrent,
  className,
  children,
}: CalendarDateLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={className}
      onClick={(event) => {
        // 修飾クリック（新規タブ等）や非主ボタンでは元タブでnavigationが起きないため、
        // flagを残すと後続のdirect navigationで誤ってresult focusが発火する（#362 P3）
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        markCalendarNavigation(dateStr);
      }}
    >
      {children}
    </Link>
  );
}
