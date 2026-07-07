import type { WikiHeading } from "@/lib/markdownHeadings";
import { TEXT_LINK_CLASS } from "@/components/ui/TextLink";

type WikiTocProps = {
  headings: WikiHeading[];
};

function WikiTocList({ headings }: WikiTocProps) {
  return (
    <ul className="space-y-1 text-sm">
      {headings.map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? "pl-4" : ""}>
          <a href={`#${heading.id}`} className={`${TEXT_LINK_CLASS} text-sm`}>
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// 見出し（h2/h3）から目次を描画する。h3 はインデントして階層を表現する。
// <details> の open/close はブラウザ側のDOM状態でブレークポイントごとに
// 強制できないため、モバイル用（折りたたみ）とPC用（常時展開）の2つの
// マークアップを用意し、Tailwindの表示切り替え（hidden / md:hidden）で
// 出し分ける（JS不要）。
export function WikiToc({ headings }: WikiTocProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <>
      <details className="rounded-lg border border-foreground/10 bg-background p-3 md:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          目次
        </summary>
        <nav aria-label="目次" className="mt-2">
          <WikiTocList headings={headings} />
        </nav>
      </details>

      <nav
        aria-label="目次"
        className="hidden rounded-lg border border-foreground/10 bg-background p-3 md:block"
      >
        <p className="text-sm font-semibold text-foreground">目次</p>
        <div className="mt-2">
          <WikiTocList headings={headings} />
        </div>
      </nav>
    </>
  );
}
