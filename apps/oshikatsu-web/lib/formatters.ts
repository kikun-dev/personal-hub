export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
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
