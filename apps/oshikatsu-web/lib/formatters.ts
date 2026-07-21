export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// 6/13(土) のように月/日(曜日)で表示する
export function formatMonthDayWithWeekday(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
}

// 7月13日(月) のように月日(曜日)を漢字区切りで表示する（トップページ見出し用）
export function formatMonthDayKanjiWithWeekday(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日(${weekday})`;
}

export function formatBirthday(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function calculateAge(dateOfBirth: string, baseDate?: Date): number | null {
  const base = baseDate ?? new Date();
  const birth = new Date(dateOfBirth + "T00:00:00");

  if (isNaN(birth.getTime())) return null;

  let age = base.getFullYear() - birth.getFullYear();
  const monthDiff = base.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && base.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

// group名の区切りは日本語UIの読点（、）に統一する（#395）
export function formatGroupNames(groupNames: string[]): string {
  return groupNames.join("、");
}
