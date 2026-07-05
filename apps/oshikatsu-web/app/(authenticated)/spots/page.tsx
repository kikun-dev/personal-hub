import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createSpotRepository } from "@/repositories/spotRepository";
import { listSpots } from "@/usecases/listSpots";
import { SPOT_SOURCE_TYPE_LABELS } from "@/types/spot";
import { Button } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/TextLink";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";

// 暫定のシンプルな一覧表示。PR③で地図ビュー（@vis.gl/react-google-maps の Map）に
// 置き換える予定（Issue #286 Phase 1 はまず管理CRUDのみ）。
export default async function SpotsPage() {
  const supabase = await createClient();
  const repo = createSpotRepository(supabase);
  const spots = await listSpots(repo);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">聖地マップ</h1>
        {isAdmin && (
          <Link href="/spots/new">
            <Button>スポットを追加</Button>
          </Link>
        )}
      </div>

      {spots.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          スポットが登録されていません
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left">
                <th className="pb-2 pr-4 font-medium text-foreground/70">名前</th>
                <th className="pb-2 pr-4 font-medium text-foreground/70">
                  種別
                </th>
                <th className="pb-2 pr-4 font-medium text-foreground/70">
                  都道府県
                </th>
                {isAdmin && (
                  <th className="pb-2 font-medium text-foreground/70">操作</th>
                )}
              </tr>
            </thead>
            <tbody>
              {spots.map((spot) => (
                <tr key={spot.id} className="border-b border-foreground/5">
                  <td className="py-2 pr-4 text-foreground">{spot.name}</td>
                  <td className="py-2 pr-4 text-foreground/80">
                    {spot.sourceTypes.length > 0
                      ? spot.sourceTypes
                          .map((sourceType) => SPOT_SOURCE_TYPE_LABELS[sourceType])
                          .join("、")
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 text-foreground/80">
                    {spot.prefecture ?? "—"}
                  </td>
                  {isAdmin && (
                    <td className="py-2">
                      <TextLink
                        href={`/spots/${spot.id}/edit`}
                        className="text-sm"
                      >
                        編集
                      </TextLink>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
