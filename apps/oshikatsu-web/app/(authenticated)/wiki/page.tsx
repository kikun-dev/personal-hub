import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getWikiPagesData } from "@/usecases/readOrbitWikiData";

export default async function WikiPage() {
  const pages = await getWikiPagesData();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Wiki</h1>

      {pages.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          ページが登録されていません
        </p>
      ) : (
        <ul className="space-y-2">
          {pages.map((page) => (
            <li key={page.id}>
              <Link href={`/wiki/${page.slug}`}>
                <Card className="transition-colors hover:border-foreground/30">
                  <span className="text-sm font-semibold text-foreground">
                    {page.title}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
