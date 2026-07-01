import type { PersonRepository } from "@/types/repositories";
import type { PersonDetail } from "@/types/person";

// 制作陣詳細（本人 + 担当楽曲）をまとめて取得する。
export async function getPersonDetail(
  repo: PersonRepository,
  id: string
): Promise<PersonDetail | null> {
  const person = await repo.findById(id);
  if (!person) {
    return null;
  }
  const creditedSongs = await repo.findCreditedSongsByPersonId(id);
  return { person, creditedSongs };
}
