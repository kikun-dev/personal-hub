import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { createHeadingIdAssigner } from "@/lib/markdownHeadings";
import { TEXT_LINK_CLASS } from "@/components/ui/TextLink";

type WikiPageContentProps = {
  bodyMarkdown: string;
};

// react-markdown が生成した React children から見出しのプレーンテキストを
// 復元する（強調・リンク等のインライン要素も再帰的に剥がす）。
// lib/markdownHeadings.ts の slugifyHeadingText（生Markdownの正規表現除去）と
// 入力形態は異なるが、最終的なテキスト内容は一致するため、同じ
// createHeadingIdAssigner に通せば目次側と同じ id 列を得られる。
function nodeChildrenToText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    return children.map(nodeChildrenToText).join("");
  }
  if (isValidElement(children)) {
    const props = children.props as { children?: ReactNode };
    return nodeChildrenToText(props.children);
  }
  return "";
}

function isInternalHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#");
}

// Server Component（"use client" 不要）。react-markdown は RSC でも動作する。
export function WikiPageContent({ bodyMarkdown }: WikiPageContentProps) {
  // 目次（extractHeadings）と本文の id 割り当てを一致させるため、
  // 1回のレンダリング内で連番カウンタを共有するクロージャを作る。
  const assignHeadingId = createHeadingIdAssigner();

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="mt-6 text-lg font-bold text-foreground first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => {
      const id = assignHeadingId(nodeChildrenToText(children));
      return (
        <h2
          id={id}
          className="mt-8 scroll-mt-20 border-b border-foreground/10 pb-1 text-base font-bold text-foreground first:mt-0"
        >
          {children}
        </h2>
      );
    },
    h3: ({ children }) => {
      const id = assignHeadingId(nodeChildrenToText(children));
      return (
        <h3
          id={id}
          className="mt-6 scroll-mt-20 text-sm font-bold text-foreground first:mt-0"
        >
          {children}
        </h3>
      );
    },
    h4: ({ children }) => (
      <h4 className="mt-4 text-sm font-semibold text-foreground">{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="mt-4 text-sm font-semibold text-foreground">{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 className="mt-4 text-sm font-semibold text-foreground">{children}</h6>
    ),
    p: ({ children }) => (
      <p className="mt-3 text-sm leading-relaxed text-foreground/90 first:mt-0">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/90">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground/90">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    table: ({ children }) => (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-foreground/10 bg-foreground/5 px-3 py-2 text-left font-semibold text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-foreground/10 px-3 py-2 text-foreground/90">
        {children}
      </td>
    ),
    a: ({ href, children }) => {
      const url = href ?? "";
      const internal = isInternalHref(url);
      return (
        <a
          href={url}
          className={TEXT_LINK_CLASS}
          {...(internal
            ? {}
            : { target: "_blank", rel: "noopener noreferrer" })}
        >
          {children}
        </a>
      );
    },
    code: ({ className, children }) => {
      // フェンス付きコードブロック（```lang）は remark が language-* クラスを
      // 付与するため、インラインコードとは別スタイル（pre側の背景に馴染ませる）にする。
      const isFencedBlock =
        typeof className === "string" && className.includes("language-");

      if (isFencedBlock) {
        return (
          <code className={`${className} font-mono text-sm text-foreground`}>
            {children}
          </code>
        );
      }

      return (
        <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em] text-foreground">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mt-3 overflow-x-auto rounded-lg bg-foreground/5 p-3 text-sm">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-3 border-l-2 border-foreground/20 pl-3 text-sm text-foreground/70">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-6 border-foreground/10" />,
  };

  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {bodyMarkdown}
      </ReactMarkdown>
    </div>
  );
}
