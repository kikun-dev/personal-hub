// Wiki的静的ページ集（#313 閲覧 / #314 作成・編集）のドメイン型。

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
  // 編集フォームの初期値に必要なため #314 で追加（一覧の表示順）。
  sortOrder: number;
  updatedAt: string;
};

// フォーム入力型。sortOrder は venueForm の capacity 等と同じく数値項目だが
// フォームからは文字列で受け取り、repository 側で数値へ変換する。
export type CreateWikiPageInput = {
  slug: string;
  title: string;
  bodyMarkdown: string;
  sortOrder: string;
};

export type UpdateWikiPageInput = CreateWikiPageInput;
