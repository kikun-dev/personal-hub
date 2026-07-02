import type { PersonOption, PersonRole } from "@/types/person";
import type {
  CreateSongCostumeInput,
  CreateSongFormationRowInput,
  CreateSongReleaseLinkInput,
} from "@/types/song";

/**
 * SongForm とそのセクション child（components/admin/song/*Section.tsx）で
 * 共有する型・純粋関数。SongForm.tsx から直接 import すると
 * SongForm -> セクション -> SongForm の循環 import になるため、
 * ここへ切り出している。
 */

export type FormReleaseLink = CreateSongReleaseLinkInput & { _key: string };
export type FormFormationRow = CreateSongFormationRowInput & { _key: string };
export type FormCostume = CreateSongCostumeInput & { _key: string };

export type ParticipantOption = {
  memberId: string;
  memberName: string;
  memberKana: string;
  isInSongGroup: boolean;
};

// 制作陣フィールドと担当(role)の対応。編曲は作曲(music)を共用する。
export const CREDIT_FIELDS = [
  { key: "lyricsPeople", label: "作詞", role: "lyrics" },
  { key: "musicPeople", label: "作曲", role: "music" },
  { key: "arrangementPeople", label: "編曲", role: "music" },
  { key: "choreographyPeople", label: "振付", role: "choreography" },
] as const;

export type CreditFieldKey = (typeof CREDIT_FIELDS)[number]["key"];

// 担当(role)を持つ人物の表示名のみを候補に返す
export function peopleNamesForRole(people: PersonOption[], role: PersonRole): string[] {
  return people
    .filter((person) => person.roles.includes(role))
    .map((person) => person.displayName);
}

export function splitPeople(value: string): string[] {
  return value
    .split(",")
    .flatMap((part) => part.split("、"))
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinPeople(people: string[]): string {
  return people.join(", ");
}

export function parseMemberCount(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}
