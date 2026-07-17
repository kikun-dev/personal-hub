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
      onClick={() => markCalendarNavigation(dateStr)}
    >
      {children}
    </Link>
  );
}
