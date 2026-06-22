import { notFound } from "next/navigation";
import { ReleaseDetail } from "@/components/releases/ReleaseDetail";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
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
        <ListBackButton
          fallbackHref="/releases"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← リリース一覧
        </ListBackButton>
        <PendingLink
          href={`/admin/releases/${release.id}/edit`}
          feedback="global"
        >
          <Button variant="secondary">編集</Button>
        </PendingLink>
      </div>
      <ReleaseDetail release={release} />
    </div>
  );
}
