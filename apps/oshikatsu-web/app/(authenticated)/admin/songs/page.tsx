import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createSongRepository } from "@/repositories/songRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { listSongs } from "@/usecases/listSongs";
import { getGroups } from "@/usecases/getGroups";
import { Button } from "@/components/ui/Button";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { formatDate } from "@/lib/formatters";
import type { Group } from "@/types/group";

export default async function AdminSongsPage() {
  const supabase = await createClient();

  const [songs, groups] = await Promise.all([
    listSongs(createSongRepository(supabase)),
    getGroups(createGroupRepository(supabase)),
  ]);

  const groupMap = new Map<string, Group>(groups.map((g) => [g.id, g]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">楽曲管理</h1>
        <Link href="/admin/songs/new">
          <Button>新規追加</Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <th className="pb-2 pr-4 font-medium text-foreground/70">タイトル</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">グループ</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">リリース日</th>
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr
                key={song.id}
                className="border-b border-foreground/5"
              >
                <td className="py-2 pr-4 text-foreground">{song.title}</td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {song.groupIds.map((groupId) => {
                      const group = groupMap.get(groupId);
                      if (!group) return null;
                      return (
                        <GroupBadge
                          key={groupId}
                          groupName={group.nameJa}
                          groupColor={group.color}
                        />
                      );
                    })}
                  </div>
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {song.releaseDate ? formatDate(song.releaseDate) : "—"}
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/songs/${song.id}/edit`}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {songs.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          楽曲が登録されていません
        </p>
      )}
    </div>
  );
}
