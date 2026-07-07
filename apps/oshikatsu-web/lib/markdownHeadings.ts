// Wiki本文（Markdown）の見出し抽出・アンカーid生成（#313）。
// 目次（WikiToc）と本文レンダリング（WikiPageContent）が「同じ規則」で
// id を導出できるよう、両方から本モジュールの関数を使う。

export type WikiHeadingLevel = 2 | 3;

export type WikiHeading = {
  level: WikiHeadingLevel;
  text: string;
  id: string;
};

const CODE_FENCE_LINE_REGEX = /^\s{0,3}(```|~~~)/;
const HEADING_LINE_REGEX = /^(#{2,3})\s+(.+?)\s*#*\s*$/;

// 見出しテキストからベースのスラッグを生成する。
// 日本語（漢字・ひらがな・カタカナ等）は \p{L} に含まれるためそのまま残し、
// 小文字化・空白の連続 → 単一ハイフン・Markdown記法（強調/コード/リンク）と
// 記号の除去のみ行う。
function slugifyHeadingText(text: string): string {
  const withoutMarkup = text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/~~([^~]*)~~/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

  return withoutMarkup
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 見出しの id 割り当て状態（同名見出しの連番カウンタ）を1レンダリング分だけ
 * 保持するクロージャを作る。extractHeadings（目次生成）と
 * WikiPageContent（本文レンダリング）はそれぞれ独立にこの関数を呼ぶが、
 * 同じ Markdown を同じ順序で走査する限り決定的に同じ id 列を生成する。
 * 同名見出しは1件目をそのまま、2件目以降を `-2`, `-3`... で連番化する。
 */
export function createHeadingIdAssigner(): (text: string) => string {
  const counts = new Map<string, number>();

  return (text: string) => {
    const base = slugifyHeadingText(text) || "section";
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

// h2/h3 のみを対象に見出しを抽出する（コードフェンス内は除外）。
export function extractHeadings(markdown: string): WikiHeading[] {
  const assignId = createHeadingIdAssigner();
  const lines = markdown.split(/\r?\n/);
  const headings: WikiHeading[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    if (CODE_FENCE_LINE_REGEX.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const headingMatch = line.match(HEADING_LINE_REGEX);
    if (!headingMatch) continue;

    const level = headingMatch[1].length as WikiHeadingLevel;
    const text = headingMatch[2].trim();
    if (!text) continue;

    headings.push({ level, text, id: assignId(text) });
  }

  return headings;
}
