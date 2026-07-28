import type { Page, Route } from "@playwright/test";

type RouteOperation = (route: Route) => Promise<void>;
export type DisposeRoute = () => Promise<void>;

/**
 * 登録した handler だけを解除し、解除前に開始した処理の完了まで待つ。
 *
 * `page.unroute(url)` は同じ URL に一致する全 handler を解除し、実行中 handler の
 * 完了は待たない。spec 固有の通信遅延が test teardown と競合しないよう、handler の
 * 所有権と実行中 Promise をこの helper で管理する（#440）。
 */
export async function installTrackedRoute(
  page: Page,
  url: string,
  handleRoute: RouteOperation
): Promise<DisposeRoute> {
  const pending = new Set<Promise<void>>();
  let isDisposing = false;

  const handler = (route: Route): Promise<void> => {
    // dispose 開始後に届いた要求は遅延させず素通しする。待たせると drain が
    // 終わらず、teardown が handler の待ち時間ぶん延びるため。
    if (isDisposing) {
      return route.continue();
    }
    const operation = handleRoute(route);
    pending.add(operation);
    void operation.then(
      () => pending.delete(operation),
      () => pending.delete(operation)
    );
    return operation;
  };

  await page.route(url, handler);

  return async () => {
    isDisposing = true;
    // **unroute より先に drain する。** 逆順にすると、unroute の時点で route が
    // 解決され、その後 sleep から復帰した handler の `route.continue()` が
    // `Route is already handled!` になる（実測で全 test が落ちた）。
    while (pending.size > 0) {
      await Promise.allSettled([...pending]);
    }
    // handler を指定し、別の helper / fixture が所有する route は解除しない。
    await page.unroute(url, handler);
  };
}
