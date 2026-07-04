import type { GroupRepository } from "@/types/repositories";
import type { Group } from "@/types/group";

// グループ read model の既定は「その他」受け皿グループ（is_catchall）を除外する（#264）。
// 楽曲一覧・楽曲フォームなど、その他楽曲を扱う限定的な文脈でのみ includeCatchall: true を渡す。
export async function getGroups(
  repo: GroupRepository,
  options?: { includeCatchall?: boolean }
): Promise<Group[]> {
  const groups = await repo.findAll();
  return options?.includeCatchall ? groups : groups.filter((g) => !g.isCatchall);
}
