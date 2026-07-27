import type { Page, Route } from "@playwright/test";

/**
 * App Router の RSC prefetch を E2E 中だけ遮断する（#440）。
 *
 * TOP は カレンダーの日付セル約42個を含む50 URL 分の `next/link` を viewport 内に持ち、
 * 1ページの表示で prefetch が2波（合計89リクエスト）走る。ローカルの prod server と
 * Supabase はこれで飽和し、TTFB が最大1.5秒まで伸びる。この状態でリンクを操作すると、
 * ナビゲーションの RSC 応答が prefetch の後ろで詰まり、本文が届かないまま
 * `toHaveURL` の待機が尽きる。
 *
 * 失敗するのは「その瞬間サーバがどれだけ温まっていたか」次第なので、run ごとに
 * 失敗 test が移動し、分離実行では再現しない。`workers: 1` でも防げない（飽和は
 * 1ページの中で起きるため）。
 *
 * prefetch は `Next-Router-Prefetch: 1` を持ち、**ナビゲーションの RSC は持たない**。
 * このヘッダだけを判別して遮断するので、テストが検証しているナビゲーション経路自体は
 * 一切変えない。prefetch は best-effort でアプリ側が失敗を握り潰すため、
 * abort してもコンソールエラーにはならない。
 */
export function isRouterPrefetchRequest(route: Route): boolean {
  return route.request().headers()["next-router-prefetch"] === "1";
}

export async function blockRouterPrefetch(page: Page): Promise<void> {
  await page.route("**/*", async (route) => {
    if (isRouterPrefetchRequest(route)) {
      await route.abort();
      return;
    }
    // 他の handler（spec 固有の遅延注入など）へ委譲する。fallback なら
    // 「同じ route を二重に解決する」ことがなく、登録順にも依存しない。
    await route.fallback();
  });
}
