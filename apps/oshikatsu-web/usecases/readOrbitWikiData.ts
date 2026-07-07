// Orbit の閲覧系ページローダー（ADR 0006 shared read cache）。
// wiki ドメイン（#313 閲覧 / #314 作成・編集）の read model を集約する。
// 共有キャッシュ基盤（withOrbitReadClient / createSharedReadLoader）は orbitReadLoader.ts を参照。
//
// 書き込み時のキャッシュ失効は lib/revalidateOrbit.ts の revalidateOrbitWikiData()
// （"wiki" エンティティ・タグ行）を参照。
import { ORBIT_CACHE_TAGS } from "@/lib/cacheTags";
import { createWikiRepository } from "@/repositories/wikiRepository";
import { getWikiPage } from "@/usecases/getWikiPage";
import { listWikiPages } from "@/usecases/listWikiPages";
import {
  createSharedReadLoader,
  withOrbitReadClient,
} from "@/usecases/orbitReadLoader";

const loadWikiPagesPageData = createSharedReadLoader(
  ["orbit", "wiki-pages-page-data"],
  [ORBIT_CACHE_TAGS.wiki],
  async () =>
    withOrbitReadClient(async (supabase) => {
      return listWikiPages(createWikiRepository(supabase));
    })
);

const loadWikiPageDetailPageData = createSharedReadLoader(
  ["orbit", "wiki-page-detail-page-data"],
  [ORBIT_CACHE_TAGS.wiki, ORBIT_CACHE_TAGS.wikiDetail],
  async (slug: string) =>
    withOrbitReadClient(async (supabase) => {
      return getWikiPage(createWikiRepository(supabase), slug);
    })
);

export async function getWikiPagesData() {
  return loadWikiPagesPageData();
}

export async function getWikiPageDetailData(slug: string) {
  return loadWikiPageDetailPageData(slug);
}
