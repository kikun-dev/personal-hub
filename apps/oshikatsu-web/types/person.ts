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

export type CreatePersonInput = {
  displayName: string;
  dateOfBirth: string;
  roles: PersonRole[];
  biography: string;
};

export type UpdatePersonInput = CreatePersonInput;
