// カレンダーのdate選択からDaily Story見出しへのresult focus契約（#358 Decision）。
// sessionStorageへ「date選択で遷移した先のdateStr」を記録し、見出し側で現在の選択日と
// 照合して一致した場合のみfocusする。month browse（MonthSelector）はフラグを立てないため
// result focusは発火しない（#358の別transition契約: month browseはbutton focus維持 + live announcement）。
// 照合方式なのは、選択中日付の再クリック等でnavigationが発生せずフラグが残留した場合に、
// 後続のmonth browseで誤ってfocusを奪わないようにするため（consumeは常にフラグを削除する）。
const CALENDAR_NAVIGATION_FLAG_KEY = "sakalog:calendar-date-navigation";

export function markCalendarNavigation(dateStr: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CALENDAR_NAVIGATION_FLAG_KEY, dateStr);
}

export function consumeCalendarNavigation(currentDateStr: string): boolean {
  if (typeof window === "undefined") return false;
  const value = window.sessionStorage.getItem(CALENDAR_NAVIGATION_FLAG_KEY);
  if (value === null) return false;
  window.sessionStorage.removeItem(CALENDAR_NAVIGATION_FLAG_KEY);
  return value === currentDateStr;
}
