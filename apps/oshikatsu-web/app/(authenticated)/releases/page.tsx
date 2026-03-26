import { Suspense } from "react";
import { ReleaseFilters } from "@/components/releases/ReleaseFilters";
import { ReleaseCard } from "@/components/releases/ReleaseCard";
import { isReleaseType, type ReleaseFilters as ReleaseFiltersType } from "@/types/release";
import { getReleasesPageData } from "@/usecases/readOrbitData";

type ReleasesPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ReleasesPage({ searchParams }: ReleasesPageProps) {
  const params = await searchParams;

  const filters: ReleaseFiltersType = {};

  if (params.groupId) {
    filters.groupId = params.groupId;
  }

  if (params.releaseType && isReleaseType(params.releaseType)) {
    filters.releaseType = params.releaseType;
  }

  const { releases, groups } = await getReleasesPageData(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">リリース</h1>
        <span className="text-sm text-foreground/50">{releases.length}件</span>
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <ReleaseFilters groups={groups} />
      </Suspense>

      {releases.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">リリースが見つかりません</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      )}
    </div>
  );
}
