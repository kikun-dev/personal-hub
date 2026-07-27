import { test as base } from "@playwright/test";
import { blockRouterPrefetch } from "./routerPrefetch";

/**
 * このリポジトリの E2E が使う `test`（#440）。
 *
 * spec は `@playwright/test` ではなくここから import する。全 test の `page` に対して
 * RSC prefetch の遮断を適用し、prefetch fan-out によるサーバ飽和を取り除くため。
 * 理由と適用範囲は `routerPrefetch.ts` を参照。
 *
 * この fixture は test body より先に route を登録する。Playwright は後に登録された
 * handler を先に評価するため、spec 内で `page.route()` を足すとそちらが優先される。
 * その handler が `route.fallback()` を呼べばここまで委譲され、`route.continue()` で
 * 完結すればその test では prefetch 遮断が効かない。spec 側で全 URL の route を
 * 登録している箇所（reduced-motion / live-detail-attendance-density）は、prefetch を
 * `fallback()` で委譲するよう揃えてある。
 */
export const test = base.extend({
  // 第2引数は Playwright の慣例では `use` だが、位置引数なので名前は自由。
  // `use` のままだと react-hooks/rules-of-hooks が React Hook と誤検知する。
  page: async ({ page }, runTest) => {
    await blockRouterPrefetch(page);
    await runTest(page);
  },
});

export {
  expect,
  type ConsoleMessage,
  type Locator,
  type Page,
} from "@playwright/test";
