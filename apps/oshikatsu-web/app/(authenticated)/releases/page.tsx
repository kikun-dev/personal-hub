import { Suspense } from "react";
import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { listReleases } from "@/usecases/listReleases";
import { getGroups } from "@/usecases/getGroups";
import { ReleaseFilters } from "@/components/releases/ReleaseFilters";
import { ReleaseCard } from "@/components/releases/ReleaseCard";
import { isReleaseType, type ReleaseFilters as ReleaseFiltersType } from "@/types/release";

type ReleasesPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ReleasesPage({ searchParams }: ReleasesPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const releaseRepo = createReleaseRepository(supabase);
  const groupRepo = createGroupRepository(supabase);

  const filters: ReleaseFiltersType = {};

  if (params.groupId) {
    filters.groupId = params.groupId;
  }

  if (params.releaseType && isReleaseType(params.releaseType)) {
    filters.releaseType = params.releaseType;
  }

  const [releases, groups] = await Promise.all([
    listReleases(releaseRepo, filters),
    getGroups(groupRepo),
  ]);

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
