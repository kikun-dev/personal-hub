export type MarkdownLink = {
  start: number;
  end: number;
  label: string;
  url: string;
};

const TRAILING_PUNCTUATION_REGEX = /[.,!?:;\]}'"。、，．！？：；］｝」』】》〉]+$/u;

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

export function parseMarkdownLinks(text: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const labelStart = text.indexOf("[", cursor);
    if (labelStart === -1) break;

    const labelEnd = text.indexOf("]", labelStart + 1);
    if (labelEnd === -1 || text[labelEnd + 1] !== "(") {
      cursor = labelStart + 1;
      continue;
    }

    const urlStart = labelEnd + 2;
    let depth = 1;
    let i = urlStart;

    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      i += 1;
    }

    if (depth !== 0) {
      cursor = labelStart + 1;
      continue;
    }

    const label = text.slice(labelStart + 1, labelEnd);
    const url = text.slice(urlStart, i - 1).trim();
    if (label && isHttpUrl(url)) {
      links.push({ start: labelStart, end: i, label, url });
    }

    cursor = i;
  }

  return links;
}

export function splitTrailingPunctuation(url: string): {
  cleanUrl: string;
  trailing: string;
} {
  let cleanUrl = url;
  let trailing = "";

  const punctuationMatch = cleanUrl.match(TRAILING_PUNCTUATION_REGEX);
  if (punctuationMatch) {
    trailing = punctuationMatch[0];
    cleanUrl = cleanUrl.slice(0, -trailing.length);
  }

  // 末尾 ')' は URL 本体での対応括弧が不足している場合のみ保持する。
  while (cleanUrl.endsWith(")")) {
    const withoutLast = cleanUrl.slice(0, -1);
    const openCount = (withoutLast.match(/\(/g) ?? []).length;
    const closeCount = (withoutLast.match(/\)/g) ?? []).length;

    if (openCount > closeCount) {
      break;
    }

    cleanUrl = withoutLast;
    trailing = `)${trailing}`;
  }

  return { cleanUrl, trailing };
}

export function extractHttpUrlsFromText(text: string): string[] {
  const rawUrlRegex = /https?:\/\/[^\s]+/g;
  const urls = new Set<string>();

  for (const markdownLink of parseMarkdownLinks(text)) {
    const { cleanUrl } = splitTrailingPunctuation(markdownLink.url);
    if (isHttpUrl(cleanUrl)) {
      urls.add(cleanUrl);
    }
  }

  for (const match of text.matchAll(rawUrlRegex)) {
    const rawUrl = match[0];
    if (!rawUrl) continue;

    const { cleanUrl } = splitTrailingPunctuation(rawUrl);
    if (isHttpUrl(cleanUrl)) {
      urls.add(cleanUrl);
    }
  }

  return [...urls];
}
