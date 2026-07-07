import Link from "next/link";
import { notFound } from "next/navigation";
import { WikiPageContent } from "@/components/wiki/WikiPageContent";
import { WikiToc } from "@/components/wiki/WikiToc";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { extractHeadings } from "@/lib/markdownHeadings";
import { APP_ROUTES } from "@/lib/routes";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";
import { getWikiPageDetailData } from "@/usecases/readOrbitWikiData";

// slug はURLに直接現れるクライアント入力境界のため、想定形式（英小文字・数字・
// ハイフン）に合致しない場合はDBを引かずに404にする。
const SLUG_FORMAT_REGEX = /^[a-z0-9-]+$/;

type WikiDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function WikiDetailPage({ params }: WikiDetailPageProps) {
  const { slug } = await params;

  if (!SLUG_FORMAT_REGEX.test(slug)) {
    notFound();
  }

  const page = await getWikiPageDetailData(slug);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  if (!page) {
    notFound();
  }

  const headings = extractHeadings(page.bodyMarkdown);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref={APP_ROUTES.wiki}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← Wiki一覧
        </ListBackButton>
        {isAdmin && (
          <Link href={`/wiki/${page.slug}/edit`}>
            <Button variant="secondary">編集</Button>
          </Link>
        )}
      </div>

      <h1 className="text-xl font-bold text-foreground">{page.title}</h1>

      <WikiToc headings={headings} />

      <WikiPageContent bodyMarkdown={page.bodyMarkdown} />
    </div>
  );
}
