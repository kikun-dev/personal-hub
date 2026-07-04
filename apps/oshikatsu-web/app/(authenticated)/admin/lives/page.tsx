import Link from "next/link";
import { getLivesPageData } from "@/usecases/readOrbitData";
import { Button } from "@/components/ui/Button";
import { AdminLivesTable } from "@/components/admin/AdminLivesTable";

export default async function AdminLivesPage() {
  const { lives } = await getLivesPageData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">ライブ管理</h1>
        <Link href="/admin/lives/new">
          <Button>新規追加</Button>
        </Link>
      </div>

      <AdminLivesTable lives={lives} />
    </div>
  );
}
