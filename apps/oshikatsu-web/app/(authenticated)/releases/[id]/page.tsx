import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { getRelease } from "@/usecases/getRelease";
import { ReleaseDetail } from "@/components/releases/ReleaseDetail";
import { Button } from "@/components/ui/Button";

type ReleaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReleaseDetailPage({ params }: ReleaseDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const repo = createReleaseRepository(supabase);
  const release = await getRelease(repo, id);

  if (!release) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/releases" className="text-sm text-foreground/60 hover:text-foreground">
          ← リリース一覧
        </Link>
        <Link href={`/admin/releases/${release.id}/edit`}>
          <Button variant="secondary">編集</Button>
        </Link>
      </div>
      <ReleaseDetail release={release} />
    </div>
  );
}
