import { isValidDateString } from "./validation";

type ZodiacBoundary = {
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

const ZODIAC_BOUNDARIES: ZodiacBoundary[] = [
  { name: "おひつじ座", startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
  { name: "おうし座", startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  { name: "ふたご座", startMonth: 5, startDay: 21, endMonth: 6, endDay: 21 },
  { name: "かに座", startMonth: 6, startDay: 22, endMonth: 7, endDay: 22 },
  { name: "しし座", startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
  { name: "おとめ座", startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
  { name: "てんびん座", startMonth: 9, startDay: 23, endMonth: 10, endDay: 23 },
  { name: "さそり座", startMonth: 10, startDay: 24, endMonth: 11, endDay: 22 },
  { name: "いて座", startMonth: 11, startDay: 23, endMonth: 12, endDay: 21 },
  { name: "やぎ座", startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
  { name: "みずがめ座", startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
  { name: "うお座", startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
];

export function calculateZodiac(dateOfBirth: string): string | null {
  if (!dateOfBirth || !isValidDateString(dateOfBirth)) return null;

  const [, monthRaw, dayRaw] = dateOfBirth.split("-");
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  for (const zodiac of ZODIAC_BOUNDARIES) {
    const { startMonth, startDay, endMonth, endDay } = zodiac;

    if (startMonth <= endMonth) {
      const afterStart = month > startMonth || (month === startMonth && day >= startDay);
      const beforeEnd = month < endMonth || (month === endMonth && day <= endDay);
      if (afterStart && beforeEnd) return zodiac.name;
      continue;
    }

    const inLateYear = month > startMonth || (month === startMonth && day >= startDay);
    const inEarlyYear = month < endMonth || (month === endMonth && day <= endDay);
    if (inLateYear || inEarlyYear) return zodiac.name;
  }

  return null;
}
