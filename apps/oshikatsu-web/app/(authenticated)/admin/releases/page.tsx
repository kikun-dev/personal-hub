import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { listReleases } from "@/usecases/listReleases";
import { Button } from "@/components/ui/Button";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { formatDate } from "@/lib/formatters";
import { RELEASE_TYPE_LABELS } from "@/types/release";

export default async function AdminReleasesPage() {
  const supabase = await createClient();
  const releases = await listReleases(createReleaseRepository(supabase));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">リリース管理</h1>
        <Link href="/admin/releases/new">
          <Button>新規追加</Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <th className="pb-2 pr-4 font-medium text-foreground/70">タイトル</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">グループ</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">タイプ</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">No.</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">リリース日</th>
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((release) => (
              <tr key={release.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4 text-foreground">{release.title}</td>
                <td className="py-2 pr-4">
                  <GroupBadge
                    groupName={release.groupNameJa}
                    groupColor={release.groupColor}
                  />
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {RELEASE_TYPE_LABELS[release.releaseType]}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {release.numbering ?? "—"}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {release.releaseDate ? formatDate(release.releaseDate) : "—"}
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/releases/${release.id}/edit`}
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

      {releases.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          リリースが登録されていません
        </p>
      )}
    </div>
  );
}
