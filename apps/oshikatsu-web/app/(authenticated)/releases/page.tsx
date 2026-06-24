import { ReleaseBrowser } from "@/components/releases/ReleaseBrowser";
import { isReleaseType, type ReleaseType } from "@/types/release";
import { getReleasesPageData } from "@/usecases/readOrbitData";

type ReleasesPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ReleasesPage({ searchParams }: ReleasesPageProps) {
  const params = await searchParams;
  const initialGroupId = params.groupId ?? "";
  const initialReleaseType: ReleaseType | "" =
    params.releaseType && isReleaseType(params.releaseType)
      ? params.releaseType
      : "";

  // 絞り込みはクライアント側で行うため、常に全件取得する
  const { releases, groups } = await getReleasesPageData({});

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">リリース</h1>
      <ReleaseBrowser
        groups={groups}
        initialGroupId={initialGroupId}
        initialReleaseType={initialReleaseType}
        releases={releases}
      />
    </div>
  );
}
