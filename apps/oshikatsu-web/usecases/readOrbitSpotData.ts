// Orbit の閲覧系ページローダー（ADR 0006 shared read cache）。
// spot ドメインの read model を集約する。
// 共有キャッシュ基盤（withOrbitReadClient / createSharedReadLoader）は orbitReadLoader.ts を参照。
import { ORBIT_CACHE_TAGS } from "@/lib/cacheTags";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createSpotRepository } from "@/repositories/spotRepository";
import { getSpot } from "@/usecases/getSpot";
import { listMemberOptions } from "@/usecases/listMemberOptions";
import { listSpots } from "@/usecases/listSpots";
import {
  createSharedReadLoader,
  withOrbitReadClient,
} from "@/usecases/orbitReadLoader";

const loadSpotsPageData = createSharedReadLoader(
  ["orbit", "spots-page-data"],
  [ORBIT_CACHE_TAGS.spots, ORBIT_CACHE_TAGS.members],
  async () =>
    withOrbitReadClient(async (supabase) => {
      const [spots, memberOptions] = await Promise.all([
        listSpots(createSpotRepository(supabase)),
        listMemberOptions(createMemberRepository(supabase)),
      ]);

      return { spots, memberOptions };
    })
);

const loadSpotDetailPageData = createSharedReadLoader(
  ["orbit", "spot-detail-page-data"],
  [ORBIT_CACHE_TAGS.spots, ORBIT_CACHE_TAGS.spotsDetail],
  async (id: string) =>
    withOrbitReadClient(async (supabase) => {
      return getSpot(createSpotRepository(supabase), id);
    })
);

export async function getSpotsPageData() {
  return loadSpotsPageData();
}

export async function getSpotDetailPageData(id: string) {
  return loadSpotDetailPageData(id);
}
