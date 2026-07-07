import { Suspense } from "react";
import Link from "next/link";
import { getSpotsPageData } from "@/usecases/readOrbitSpotData";
import { SpotsMapView } from "@/components/spots/SpotsMapView";
import { Button } from "@/components/ui/Button";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";

export default async function SpotsPage() {
  const { spots, memberOptions } = await getSpotsPageData();
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

      {/* useSearchParams を使うクライアントコンポーネントは Suspense で包む
          （lives / songs 等の Browser パターンと同じ） */}
      <Suspense fallback={<div className="h-10" />}>
        <SpotsMapView spots={spots} memberOptions={memberOptions} isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
