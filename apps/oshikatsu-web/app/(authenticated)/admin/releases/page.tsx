import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { listReleases } from "@/usecases/listReleases";
import { Button } from "@/components/ui/Button";
import { PendingLink } from "@/components/ui/PendingLink";
import { AdminReleasesTable } from "@/components/admin/AdminReleasesTable";

export default async function AdminReleasesPage() {
  const supabase = await createClient();
  const releases = await listReleases(createReleaseRepository(supabase));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">リリース管理</h1>
        <PendingLink href="/admin/releases/new" feedback="global">
          <Button>新規追加</Button>
        </PendingLink>
      </div>

      <AdminReleasesTable releases={releases} />
    </div>
  );
}
