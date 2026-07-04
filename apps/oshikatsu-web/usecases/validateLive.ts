import type { CreateLiveInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import { isLiveType } from "@/types/live";
import { isValidDateString } from "@/lib/validation";

function isValidTimeString(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function validateLive(input: CreateLiveInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name.trim()) {
    errors.push({ field: "name", message: "ライブ名を入力してください" });
  } else if (input.name.length > 200) {
    errors.push({ field: "name", message: "ライブ名は200文字以内で入力してください" });
  }

  if (!input.liveType || !isLiveType(input.liveType)) {
    errors.push({ field: "liveType", message: "種別を選択してください" });
  }

  // 単発ライブは1会場のみ（複数日は可）。ツアー/フェス/配信/その他は会場数を制約しない
  // （配信ライブは複数日程・会場任意を許容）
  if (input.liveType === "single") {
    const venueIds = new Set(
      input.performances.map((performance) => performance.venueId).filter(Boolean)
    );
    if (venueIds.size > 1) {
      errors.push({
        field: "liveType",
        message: "単発ライブは1会場のみです（複数会場はツアーを選択してください）",
      });
    }
  }

  if (input.description.length > 2000) {
    errors.push({ field: "description", message: "説明は2000文字以内で入力してください" });
  }

  input.performances.forEach((performance, index) => {
    if (!performance.performanceDate) {
      errors.push({
        field: `performances.${index}.performanceDate`,
        message: "公演日を入力してください",
      });
    } else if (!isValidDateString(performance.performanceDate)) {
      errors.push({
        field: `performances.${index}.performanceDate`,
        message: "公演日はYYYY-MM-DD形式で入力してください",
      });
    }

    // 開場は単発/ツアー/その他のみ（フェス=出演時刻、配信=配信時刻のため検証しない）
    const showsDoorsOpen =
      input.liveType !== "festival" && input.liveType !== "online";
    if (
      showsDoorsOpen &&
      performance.doorsOpenAt.trim() &&
      !isValidTimeString(performance.doorsOpenAt.trim())
    ) {
      errors.push({
        field: `performances.${index}.doorsOpenAt`,
        message: "開場時刻はHH:MM形式で入力してください",
      });
    }

    if (performance.startsAt.trim() && !isValidTimeString(performance.startsAt.trim())) {
      errors.push({
        field: `performances.${index}.startsAt`,
        message: "開演時刻はHH:MM形式で入力してください",
      });
    }

    const rosterIds = new Set(input.performerMemberIds);

    const seenAbsentMembers = new Set<string>();
    for (const absence of performance.absences) {
      if (!absence.memberId) continue;
      if (seenAbsentMembers.has(absence.memberId)) {
        errors.push({
          field: `performances.${index}.absences`,
          message: "同じ休演メンバーが重複しています",
        });
        break;
      }
      // 休演は出演メンバー（基準ロスター）の範囲内のみ
      if (rosterIds.size > 0 && !rosterIds.has(absence.memberId)) {
        errors.push({
          field: `performances.${index}.absences`,
          message: "休演は出演メンバーから選択してください",
        });
        break;
      }
      seenAbsentMembers.add(absence.memberId);
    }
  });

  return errors;
}
