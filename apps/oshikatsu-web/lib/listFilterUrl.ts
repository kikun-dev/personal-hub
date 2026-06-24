/**
 * 一覧のクライアント側フィルタ用に、URL の検索クエリだけを更新する。
 *
 * `window.history.replaceState` を使うため、Next App Router の
 * サーバーコンポーネント再実行（再フェッチ）を伴わずにアドレスバーを更新できる。
 * これによりリロード・共有・詳細→一覧の戻り状態保持（#78）を維持しつつ、
 * 絞り込み自体はクライアント側 in-memory で瞬時に行える。
 *
 * 値が空文字のキーはクエリから削除する。
 */
export function replaceListFilterParams(updates: Record<string, string>): void {
  if (typeof window === "undefined") {
    return;
  }

  const search = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      search.set(key, value);
    } else {
      search.delete(key);
    }
  }

  const query = search.toString();
  const { pathname, hash } = window.location;
  const url = `${pathname}${query ? `?${query}` : ""}${hash}`;

  window.history.replaceState(window.history.state, "", url);
}
