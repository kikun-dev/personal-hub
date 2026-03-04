export type CalendarDay = {
  date: number;
  isCurrentMonth: boolean;
  dateStr: string;
};

export function generateCalendarGrid(year: number, month: number): CalendarDay[][] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();

  const days: CalendarDay[] = [];

  // 前月の日
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthLastDay - i;
    const prevMonth = month - 1;
    const prevYear = prevMonth < 1 ? year - 1 : year;
    const m = prevMonth < 1 ? 12 : prevMonth;
    days.push({
      date,
      isCurrentMonth: false,
      dateStr: `${prevYear}-${String(m).padStart(2, "0")}-${String(date).padStart(2, "0")}`,
    });
  }

  // 当月の日
  for (let date = 1; date <= daysInMonth; date++) {
    days.push({
      date,
      isCurrentMonth: true,
      dateStr: `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`,
    });
  }

  // 次月の日（6週分になるよう埋める）
  const remaining = 42 - days.length;
  for (let date = 1; date <= remaining; date++) {
    const nextMonth = month + 1;
    const nextYear = nextMonth > 12 ? year + 1 : year;
    const m = nextMonth > 12 ? 1 : nextMonth;
    days.push({
      date,
      isCurrentMonth: false,
      dateStr: `${nextYear}-${String(m).padStart(2, "0")}-${String(date).padStart(2, "0")}`,
    });
  }

  // 週ごとに分割
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}
