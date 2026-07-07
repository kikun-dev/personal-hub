import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/requireAdmin";
import { createWikiRepository } from "@/repositories/wikiRepository";
import { getWikiPage } from "@/usecases/getWikiPage";
import { WikiPageForm } from "@/components/wiki/WikiPageForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateWikiPageAction, deleteWikiPageAction } from "./actions";
import type { UpdateWikiPageInput } from "@/types/wiki";
import type { ValidationError } from "@/types/errors";

type EditWikiPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditWikiPage({ params }: EditWikiPageProps) {
  const { slug } = await params;

  // 編集対象本体はページ側の createClient()（requireAdmin 内部）で取得し、
  // 即時性を優先する（docs/ai/PROJECT.md「管理導線の運用メモ」に準拠）。
  const supabase = await requireAdmin();
  const page = await getWikiPage(createWikiRepository(supabase), slug);

  if (!page) {
    notFound();
  }

  // ネストした Server Action（"use server" 関数）内では page への
  // null narrowing が効かないため、id はここで確定した変数として切り出す。
  const pageId = page.id;

  const initialValues: UpdateWikiPageInput = {
    slug: page.slug,
    title: page.title,
    bodyMarkdown: page.bodyMarkdown,
    sortOrder: String(page.sortOrder),
  };

  async function handleSubmit(
    values: UpdateWikiPageInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateWikiPageAction(pageId, values);
    if (!result.errors) {
      // slug 変更時は新しい slug の詳細ページへ遷移する
      redirect(`/wiki/${values.slug.trim()}`);
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteWikiPageAction(pageId);
    if (!result.error) {
      redirect("/wiki");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Wikiページを編集</h1>
        <DeleteButton
          confirmMessage={`${page.title} を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <WikiPageForm mode="edit" initialValues={initialValues} onSubmit={handleSubmit} />
    </div>
  );
}
