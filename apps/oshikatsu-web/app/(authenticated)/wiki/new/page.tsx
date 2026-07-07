import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/requireAdmin";
import { WikiPageForm } from "@/components/wiki/WikiPageForm";
import { createWikiPageAction } from "./actions";
import type { CreateWikiPageInput } from "@/types/wiki";
import type { ValidationError } from "@/types/errors";

export default async function NewWikiPage() {
  await requireAdmin();

  async function handleSubmit(
    values: CreateWikiPageInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createWikiPageAction(values);
    if (!result.errors) {
      // 作成したページをそのまま確認できるよう詳細ページへ遷移する
      // （更新時の遷移先 /wiki/[slug] と揃える）。
      redirect(`/wiki/${values.slug.trim()}`);
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Wikiページを追加</h1>
      <WikiPageForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
