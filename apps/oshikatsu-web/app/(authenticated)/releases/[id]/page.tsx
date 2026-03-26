import { notFound } from "next/navigation";
import Link from "next/link";
import { ReleaseDetail } from "@/components/releases/ReleaseDetail";
import { Button } from "@/components/ui/Button";
import { getReleaseDetailPageData } from "@/usecases/readOrbitData";

type ReleaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReleaseDetailPage({ params }: ReleaseDetailPageProps) {
  const { id } = await params;
  const release = await getReleaseDetailPageData(id);

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
