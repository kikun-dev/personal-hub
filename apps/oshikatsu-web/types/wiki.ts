// Wiki的静的ページ集（#313）のドメイン型。
// 閲覧のみが対象（書き込みは #314）。

export type WikiPageListItem = {
  id: string;
  slug: string;
  title: string;
};

export type WikiPage = {
  id: string;
  slug: string;
  title: string;
  bodyMarkdown: string;
  updatedAt: string;
};
