import type { SelectRows } from "@personal-hub/supabase";
import type { WikiRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import type { WikiPage, WikiPageListItem } from "@/types/wiki";
import { RepositoryError } from "@/types/errors";

// #313 は閲覧のみが対象のため読み取り専用リポジトリとする（書き込みは #314）。
const WIKI_LIST_SELECT = "id, slug, title" as const;
const WIKI_DETAIL_SELECT =
  "id, slug, title, body_markdown, updated_at" as const;

type WikiListRow = SelectRows<
  "orbit_wiki_pages",
  typeof WIKI_LIST_SELECT
>[number];
type WikiDetailRow = SelectRows<
  "orbit_wiki_pages",
  typeof WIKI_DETAIL_SELECT
>[number];

function mapWikiListItem(row: WikiListRow): WikiPageListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
  };
}

function mapWikiPage(row: WikiDetailRow): WikiPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    updatedAt: row.updated_at,
  };
}

export function createWikiRepository(supabase: OrbitReadClient): WikiRepository {
  return {
    async findAll() {
      const { data, error } = await supabase
        .from("orbit_wiki_pages")
        .select(WIKI_LIST_SELECT)
        .order("sort_order")
        .order("title");

      if (error) {
        throw new RepositoryError("Wikiページ一覧の取得に失敗しました", error);
      }

      return data.map(mapWikiListItem);
    },

    async findBySlug(slug) {
      const { data, error } = await supabase
        .from("orbit_wiki_pages")
        .select(WIKI_DETAIL_SELECT)
        .eq("slug", slug)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("Wikiページの取得に失敗しました", error);
      }

      return mapWikiPage(data);
    },
  };
}
