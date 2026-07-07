// Orbit の閲覧系ページローダー（ADR 0006 shared read cache）。
// live / venue ドメインの read model を集約する。
// 共有キャッシュ基盤（withOrbitReadClient / createSharedReadLoader）は orbitReadLoader.ts を参照。
import { ORBIT_CACHE_TAGS } from "@/lib/cacheTags";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createVenueRepository } from "@/repositories/venueRepository";
import { createLiveRepository } from "@/repositories/liveRepository";
import { getGroups } from "@/usecases/getGroups";
import { getVenue } from "@/usecases/getVenue";
import { listVenues } from "@/usecases/listVenues";
import { getLive } from "@/usecases/getLive";
import { listPublicLives } from "@/usecases/listPublicLives";
import {
  createSharedReadLoader,
  withOrbitReadClient,
} from "@/usecases/orbitReadLoader";

const loadVenuesPageData = createSharedReadLoader(
  ["orbit", "venues-page-data"],
  [ORBIT_CACHE_TAGS.venues],
  async () =>
    withOrbitReadClient(async (supabase) => {
      return listVenues(createVenueRepository(supabase));
    })
);

const loadVenueDetailPageData = createSharedReadLoader(
  ["orbit", "venue-detail-page-data"],
  [ORBIT_CACHE_TAGS.venues, ORBIT_CACHE_TAGS.lives],
  async (id: string) =>
    withOrbitReadClient(async (supabase) => {
      const venue = await getVenue(createVenueRepository(supabase), id);
      if (!venue) {
        return null;
      }
      const performances = await createLiveRepository(
        supabase
      ).findPerformancesByVenue(id);
      return { venue, performances };
    })
);

const loadLivesPageData = createSharedReadLoader(
  ["orbit", "lives-page-data"],
  [ORBIT_CACHE_TAGS.lives, ORBIT_CACHE_TAGS.groups],
  async () =>
    withOrbitReadClient(async (supabase) => {
      const [lives, groups] = await Promise.all([
        listPublicLives(createLiveRepository(supabase)),
        getGroups(createGroupRepository(supabase)),
      ]);
      return { lives, groups };
    })
);

const loadLiveDetailPageData = createSharedReadLoader(
  ["orbit", "live-detail-page-data"],
  [ORBIT_CACHE_TAGS.lives, ORBIT_CACHE_TAGS.livesDetail],
  async (id: string) =>
    withOrbitReadClient(async (supabase) => {
      return getLive(createLiveRepository(supabase), id);
    })
);

export async function getVenuesPageData() {
  return loadVenuesPageData();
}

export async function getVenueDetailPageData(id: string) {
  return loadVenueDetailPageData(id);
}

export async function getLivesPageData() {
  return loadLivesPageData();
}

export async function getLiveDetailPageData(id: string) {
  return loadLiveDetailPageData(id);
}
