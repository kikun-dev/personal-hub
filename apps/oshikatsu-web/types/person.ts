import type { SongCreditRole } from "@/types/song";
import type { Group } from "@/types/group";

export const PERSON_ROLE_VALUES = [
  "lyrics",
  "music",
  "mv_director",
  "pv_director",
  "choreography",
  "costume",
  "artwork",
  "staging",
] as const;

export type PersonRole = (typeof PERSON_ROLE_VALUES)[number];

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  lyrics: "作詞",
  music: "作曲",
  mv_director: "MV監督",
  pv_director: "PV監督",
  choreography: "振付",
  costume: "衣装",
  artwork: "アートワーク",
  staging: "ステージング",
};

export type Person = {
  id: string;
  displayName: string;
  dateOfBirth: string | null;
  roles: PersonRole[];
  biography: string | null;
};

export type PersonOption = {
  id: string;
  displayName: string;
  roles: PersonRole[];
};

export type CreatePersonInput = {
  displayName: string;
  dateOfBirth: string;
  roles: PersonRole[];
  biography: string;
};

// 各フォームから未登録の制作陣を担当(role)付きで登録するための入力
export type EnsurePersonRoleEntry = {
  displayName: string;
  role: PersonRole;
};

export type UpdatePersonInput = CreatePersonInput;

// 制作陣詳細で表示する、担当した楽曲（クレジット由来・楽曲単位で担当をまとめる）
export type PersonCreditedSong = {
  trackId: string;
  trackTitle: string;
  groupId: string;
  groupNameJa: string;
  groupColor: string;
  roles: SongCreditRole[];
};

export type PersonDetail = {
  person: Person;
  creditedSongs: PersonCreditedSong[];
};

// 楽曲一覧と同じく、担当楽曲をグループごとに区切って表示するためのセクション
export type PersonCreditedSongSection = {
  group: Group | null;
  songs: PersonCreditedSong[];
};
