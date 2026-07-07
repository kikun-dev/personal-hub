import type { CreateWikiPageInput } from "@/types/wiki";
import type { ValidationError } from "@/types/errors";

// URL（/wiki/[slug]）に使う一意キーのため、想定形式を境界で強制する
// （app/(authenticated)/wiki/[slug]/page.tsx の SLUG_FORMAT_REGEX と同一パターン）。
const SLUG_FORMAT_REGEX = /^[a-z0-9-]+$/;

export function validateWikiPage(input: CreateWikiPageInput): ValidationError[] {
  const errors: ValidationError[] = [];

  const slug = input.slug.trim();
  if (!slug) {
    errors.push({ field: "slug", message: "スラッグを入力してください" });
  } else if (!SLUG_FORMAT_REGEX.test(slug)) {
    errors.push({
      field: "slug",
      message: "スラッグは英小文字・数字・ハイフンのみで入力してください",
    });
  } else if (slug.length > 100) {
    errors.push({ field: "slug", message: "スラッグは100文字以内で入力してください" });
  }

  if (!input.title.trim()) {
    errors.push({ field: "title", message: "タイトルを入力してください" });
  } else if (input.title.length > 100) {
    errors.push({ field: "title", message: "タイトルは100文字以内で入力してください" });
  }

  // Wikiページは参照用の長文ドキュメントを想定するため、他フィールドの
  // 2000文字上限より大きい上限にする。
  if (input.bodyMarkdown.length > 20000) {
    errors.push({
      field: "bodyMarkdown",
      message: "本文は20000文字以内で入力してください",
    });
  }

  const sortOrder = input.sortOrder.trim();
  if (sortOrder) {
    const parsed = Number(sortOrder);
    if (!Number.isInteger(parsed)) {
      errors.push({ field: "sortOrder", message: "表示順は整数で入力してください" });
    }
  }

  return errors;
}
