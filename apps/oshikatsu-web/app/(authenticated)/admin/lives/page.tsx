import Link from "next/link";
import { getLivesPageData } from "@/usecases/readOrbitData";
import { LIVE_FORMAT_LABELS, LIVE_TYPE_LABELS } from "@/types/live";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";

export default async function AdminLivesPage() {
  const lives = await getLivesPageData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">ライブ管理</h1>
        <Link href="/admin/lives/new">
          <Button>新規追加</Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <th className="pb-2 pr-4 font-medium text-foreground/70">ライブ名</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">形態</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">種別</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">公演数</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">初回日</th>
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {lives.map((live) => (
              <tr key={live.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4 text-foreground">{live.name}</td>
                <td className="py-2 pr-4 text-foreground/70">
                  {LIVE_FORMAT_LABELS[live.format]}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {LIVE_TYPE_LABELS[live.liveType]}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {live.performanceCount}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {live.firstDate ? formatDate(live.firstDate) : "—"}
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/lives/${live.id}/edit`}
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

      {lives.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          ライブが登録されていません
        </p>
      )}
    </div>
  );
}
