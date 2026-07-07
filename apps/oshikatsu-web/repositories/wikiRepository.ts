import type { SelectRows, TypedSupabaseClient } from "@personal-hub/supabase";
import type { WikiRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import type {
  WikiPage,
  WikiPageListItem,
  CreateWikiPageInput,
  UpdateWikiPageInput,
} from "@/types/wiki";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";

// #313 閲覧 + #314 作成・編集・削除。単一テーブルのためRPCは使わずtyped clientで直接書き込む。
const WIKI_LIST_SELECT = "id, slug, title" as const;
const WIKI_DETAIL_SELECT =
  "id, slug, title, body_markdown, sort_order, updated_at" as const;

// sortOrder はフォームからは文字列で受け取る（venueForm の capacity と同じ扱い）。
// 空文字・非整数はDB既定値（0）に倒す。整数チェック自体は usecases/validateWikiPage.ts
// が入力境界で行うため、ここではフォールバックのみ担保する。
function parseSortOrder(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : 0;
}

function toRow(input: CreateWikiPageInput | UpdateWikiPageInput) {
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    body_markdown: input.bodyMarkdown,
    sort_order: parseSortOrder(input.sortOrder),
  };
}

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
    sortOrder: row.sort_order,
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

    async create(input) {
      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { data, error } = await writable
        .from("orbit_wiki_pages")
        .insert(toRow(input))
        .select(WIKI_DETAIL_SELECT)
        .single();

      if (error) {
        // slug の UNIQUE 制約違反（23505）は呼び出し側（Server Action）で
        // フィールドエラーに変換するため、握りつぶさず元エラーを cause に添えて投げる。
        throw new RepositoryError("Wikiページの作成に失敗しました", error);
      }

      return mapWikiPage(data);
    },

    async update(id, input) {
      const writable: TypedSupabaseClient = asWritableClient(supabase);
      const { data, error } = await writable
        .from("orbit_wiki_pages")
        .update(toRow(input))
        .eq("id", id)
        .select(WIKI_DETAIL_SELECT)
        .single();

      if (error) {
        throw new RepositoryError("Wikiページの更新に失敗しました", error);
      }

      return mapWikiPage(data);
    },

    async delete(id) {
      const writable = asWritableClient(supabase);
      const { error } = await writable
        .from("orbit_wiki_pages")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("Wikiページの削除に失敗しました", error);
      }
    },
  };
}
