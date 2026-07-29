# Playwright 認証状態のセットアップ

Design Audit / Design QA で Playwright から認証済み画面を確認するための
`storageState`（`playwright/.auth/user.json`）を作成する手順。

Google OAuth のログイン操作は自動化せず、専用プロファイルの Chrome で
**手動ログインした結果だけ**を保存する。

## テスト実行（Design QA）

`playwright.config.ts` の `webServer` が **production build を start して配信**する（#413）。
`next dev` の on-demand compile が並列初回で timeout してフレークになるのを避けるため。

```bash
# apps/oshikatsu-web で（3001 は空けておく。使用中なら Playwright は明示 fail する）
pnpm test:e2e             # = playwright test（webServer が build + start を自動実行）
pnpm test:e2e --list      # 収集のみ（実行しない・server 起動しない）
pnpm test:e2e <spec名>    # 個別 spec

# 高回数の反復・full suiteはローカルSupabaseへ固定して実行する
pnpm test:e2e:local -- <spec名> --repeat-each=40 --workers=1

# 開発中に起動済み server を再利用して素早く回したいとき（production build 契約は外れる）。
# server と spec の「今日」を一致させるため、両方に同じ E2E_FIXED_TODAY を必ず渡す。
# （未指定で E2E_REUSE_SERVER=1 のときは config が fail-fast する）
E2E_FIXED_TODAY=2026-08-23 pnpm start                                   # 別ターミナルで server
E2E_REUSE_SERVER=1 E2E_FIXED_TODAY=2026-08-23 pnpm test:e2e <spec名>    # test
```

- `webServer.command = "pnpm build && pnpm start"`（`http://localhost:3001`）。実行前に build 時間が加わる。
- `reuseExistingServer` は**既定で false**。#413 の中核契約は「現在の HEAD の production build に対して
  検証する」ことなので、3001 に残った dev server や別 build を再利用させない。**3001 が使用中なら
  Playwright が明示 fail する**（先に dev server を止める）。開発中に dev server を再利用したいときだけ
  `E2E_REUSE_SERVER=1` で opt-in する（この場合は on-demand compile フレークが再発し得る）。
- `retries: process.env.CI ? 1 : 0`（ローカルは retry せず実失敗を隠さない）。
- `workers: 1`（スイート全体を単一 worker で直列実行）。spec ファイル**間**の並列実行が prod
  サーバ + ローカル Supabase を過負荷にし、`RepositoryError` や timing 崩れでフレークの主因に
  なっていたため。全 test が順に走るので、失敗が「did not run」で隠れることもない。
- `E2E_FIXED_TODAY`（既定 `2026-08-23`。管理点は `playwright.config.ts` の1箇所）で E2E の「今日」を
  固定する（#412）。TOP「今日の予定」/「過去の同日」やカレンダーの today セルが実行日に依存して
  fail するのを防ぐ。config が webServer（server の `getTodayInAppTimeZone`）とテストランナー（spec 内の
  同関数）双方へ渡すため両者の「今日」が一致する。別日で確認したいときは
  `E2E_FIXED_TODAY=YYYY-MM-DD pnpm test:e2e` で上書き（不正な日付は config が fail-fast する）。
  seam の**有効条件**は「本番(Vercel)でない かつ 実在する YYYY-MM-DD のとき のみ」。本番（Vercel）では
  `process.env.VERCEL` により常に無視され、production 挙動は不変。
- テスト自体の timeout は変更していない（フレークの原因は compile 遅延・並列競合であり
  timeout 不足ではない）。
- 認証は下記 `storageState`（非 CI）を利用する。失効したら再作成する。

### 高回数検証はローカルSupabaseで行う

`--repeat-each` や full suite の複数回実行は、hosted Supabase の Disk IO Budgetを
消費しないよう `pnpm test:e2e:local` を使う。このコマンドは次を自動化する。

- 接続先を `http://127.0.0.1` / `http://localhost` に限定し、remote URLなら実行前に停止する
- ローカル専用adminユーザーとRecent Attendance用の最小fixtureを冪等に準備する
- hostedには存在するがlocal `db reset`では欠けるrole GRANTを、既存の
  `scripts/perf/grant-local-roles.sql`でローカルDBだけへ冪等適用する
- `playwright/.auth/local-user.json` を生成し、通常のGoogle認証状態
  (`playwright/.auth/user.json`) と分離する
- build / Next.js server / Playwright Node processの全てへ同じローカル接続情報を渡す

前提として `docs/ops/local-supabase.md` の手順でローカルstackとmigration/seedを準備する。
通常は次の順でよい。

```bash
cd apps/oshikatsu-web
supabase start
supabase db reset # ローカルDBだけを初期化する
pnpm test:e2e:local -- --list
pnpm test:e2e:local -- playwright/recent-attendance-isolation.spec.ts --repeat-each=40
```

ローカルstackのport/keyを既定値から変えている場合だけ、
`E2E_LOCAL_SUPABASE_URL` / `E2E_LOCAL_SUPABASE_ANON_KEY` /
`E2E_LOCAL_SUPABASE_SERVICE_ROLE_KEY` で上書きする。URLのlocal-only検証は解除できない。
Docker container名を変えている場合は `E2E_LOCAL_SUPABASE_KONG_CONTAINER` /
`E2E_LOCAL_SUPABASE_DB_CONTAINER` も指定する。

### 失敗の証跡は trace に残る（#440）

`use.trace: "retain-on-failure"` を設定してある。ローカルは `retries: 0` なので
`on-first-retry` 系では発火せず、既定の `off` だと**失敗しても何も残らない**。成功時は
破棄されるためグリーン時のコストはほぼゼロ。

```bash
pnpm exec playwright show-trace test-results/<失敗したtest>/trace.zip
```

Network タブのリクエスト単位の `wait` / `receive` と、Actions のタイムラインを突き合わせると、
「アプリの不具合」に見える待機 timeout がサーバ側の詰まりだったのか、テスト側の同期不足
だったのかを推測なしで切り分けられる。

### prefetch fan-out がサーバを飽和させる問題（#440）

TOP はカレンダーの日付セル約42個を含む多数の `next/link` を viewport 内に持つ。既定の
自動 prefetch のままだと1ページの表示で RSC prefetch が2波・計89リクエスト走り、ローカルの
prod server と Supabase が飽和して TTFB が最大 1562ms まで伸びる。この状態でリンクを操作すると
**ナビゲーションの RSC 応答が prefetch の後ろで詰まり、本文が届かないまま待機が尽きて失敗する**。

飽和は1ページの中で起きるため `workers: 1` では防げない。どの test が落ちるかは
「その時点でサーバがどれだけ温まっているか」に依存するので、**失敗する test が run ごとに移動する**。

対策は発生源側で、TOPの `components/events/CalendarDateLink.tsx`・
`components/events/EventListItem.tsx`・`components/top/RecentAttendance.tsx` と、
リンク密度が高いライブ一覧・詳細の `components/lives/LiveCard.tsx`・
`components/lives/LiveDetail.tsx` が `prefetch={false}` を指定している。
カレンダーだけを止めた中間検証では、日付リンク由来は0件になった一方、TOPのイベント一覧から
13〜44件のprefetchが残り、日付navigationのRSC本文が未完了になる同じ失敗を再観測した。
イベント一覧も止めた時点では参加記録へのリンクなど7件が残り、同じ失敗を再観測した。
full suiteの中間検証では、ライブ一覧から詳細へ遷移するtestでも、一覧cardとoffscreenを含む
全公演cardから118件のprefetchが走り、保存・解除後のUI反映がtimeoutした。同じ発生原因なので
ライブ一覧・詳細にも発生源側の抑止を適用し、総requestは161→61、RSCは120→20、prefetchは
118→18へ減少した。POSTのwaitも約1.6秒→0.35秒／0.16秒へ短縮した。
**TOPのカレンダー日付・イベント一覧・最近の参加記録、およびライブ一覧・詳細の高密度リンクへ
prefetchを戻さないこと。**

最終検証はremoteのDisk IO Budgetを消費しないよう、上記`test:e2e:local`で実施した。

- Recent Attendance footer + NavigationProgressをdesktop/mobile各40回: 236/240 pass。
  4件はmobile通常モーションの既知の独立flakyで、#445へ分割した
- 最終差分のfull suiteをfresh serverで1回: 205 pass / 9 skip / 0 fail
  （#453 で seed 041 を追加した後は **227 pass / 7 skip / 0 fail**。内訳は下記）
- 同じlocal production serverでfull suiteを4反復: 820 pass / 36 skip / 0 fail
- full suite合計5回: 1025 pass / 45 skip / 0 fail。route teardown errorと
  navigation RSC本文未完了は再発しなかった

各full suiteで発生する7件（seed 041 追加前は9件）のskipは、次の意図した条件と一致した。想定外のskipはない。

- 管理フォームの編集2件: desktop/mobileのスポット各1件。ローカルseedは `orbit_spots=0` のため、
  「一覧に編集対象がない場合は固定IDに依存せずskipする」条件が成立した。データのある
  楽曲（551件）・リリース（93件）の編集ケースは両projectでpassした
  - **#453 でメンバー2件がskipから外れた。** seed 041 が `orbit_members` へ18人投入するため
    編集対象が存在するようになり、desktop/mobileとも実行されてpassする。これまで一度も
    実行されていなかったケースなので、#453 で実行してpassすることを確認済み
- viewport固有の1件: mobile専用ハンバーガー操作をdesktopでskipし、mobileではpassした
- 共有DBへの書き込み重複を避ける4件: 参加記録の保存・解除、compact badge、保存中表示、
  2ユーザー分離をmobileでskipし、同じケースをdesktopで実行してpassした

したがって7件（seed 041 追加前は9件）は環境・project条件による設計どおりのskipで、flakyの
隠蔽ではない。スポットの編集hydrationをローカルでも常時検証したい場合は、#440とは分けて
専用fixtureを追加する（メンバー側は #453 の seed 041 で解消済み）。

> route 層で prefetch 要求を `route.abort()` して塞ぐ方法も試したが、App Router が
> 通常と異なる状態になり、`reduced-motion` の `NavigationProgress` が
> **main で 40/40 pass → 変更ありで 4/40 fail** と明確に悪化したため採用しなかった。

### spec 固有の route は `installTrackedRoute` を使う（#440）

`page.unroute(url)` は**同じ URL に一致する全 handler を解除**し、しかも**実行中 handler の
完了を待たない**。遅延注入のように handler 内で待つ実装だと、sleep 中の handler が後から
`route.continue()` した時点で route が別経路で解決済みになっており、
`route.continue: Route is already handled!` で落ちる。

`playwright/trackedRoute.ts` の `installTrackedRoute(page, url, handler)` は自分が登録した
handler だけを解除し、解除前に開始した処理の完了まで待つ dispose を返す。
**spec 内で `page.route()` を直接使わず、これを経由して `finally` で dispose する。**
test timeoutによってPlaywrightがpageを先に閉じた場合は解除を省略し、一次timeoutを
`Target page, context or browser has been closed` で上書きしない。

### 既知の flaky test（最終状態）

#445で、`reduced-motion.spec.ts` のNavigationProgress通常モーション幅計測を解消した。

- 原因は、click後にNode側からstyleと矩形を3回計測する間にnavigationがcommitし、
  NavigationProgressがunmountしてouter/innerとも0幅になる競合だった
- click前からbrowser内で`requestAnimationFrame`ループを開始し、要素がmountした最初の有効frameで
  styleと矩形をまとめて保存する。MutationObserver、retry・timeout増加、プロダクト実装の変更は行わない
- local-only反復はdesktop通常/reduce・mobile通常/reduceが各40/40、合計160/160 pass。
  0幅・route teardownエラーはいずれも0件
- 続けて実行したlocal full suiteも205 passed / 9 skipped / 0 failedで完走した

#465で、`setlist-center-toggle.spec.ts` の「選択状態を色以外でも判別できる」を解消した。

- 症状は `resolveBackgroundStack` の「祖先がすべて透明です」。lightの320px / 390pxで発現し、
  失敗するviewportは実行ごとに移動していた（320pxのみ → 320px+390px → 320pxのみ）
- 原因はcomputed custom propertyの報告不整合。`html`は正しい値を持ち、より深い子孫であるCボタン自身も
  正しい値を持つのに、間の`body` / `main`だけが空になる。CSSの継承では起こり得ない組み合わせなので、
  描画ではなく報告だけが壊れている
- **観測できたのは`mobile` project（iPhone 17 descriptor = WebKit）のみ**で、lightの320px。
  `desktop` project（Desktop Chrome = Chromium）は12回試して未再現。当初これをChromium由来と記録していたが、
  再現・検証に使ったのは`--project=mobile`＝WebKitであり、誤りだったため訂正した（#467のレビュー指摘）
- 発現条件は「`emulateMedia({colorScheme})`をnavigationより前に設定」かつnarrow viewport。
  reload、rAF待ち、強制レイアウト、class付け外し、`:root`の変数再設定、viewport変更のいずれでも回復しない
- 実行構成にも依存する。`mobile` projectを単独で実行すると320pxで4/4再現し、両projectを同時に実行した
  6回では再現しなかった。これが「失敗するviewportが実行ごとに移動する」ように見えた原因
- Tailwindのutilityは`@theme inline`で値が埋め込まれるため無傷で、手書きの
  `body { background: var(--background) }` だけがtransparentと報告される
- 祖先スタックの最外郭へ`:root`の`--background`（＝ページのcanvas色）を必ず積むことで解消した。
  正常時はbodyが不透明なのでこの層には到達せず、判定は変わらない。この対処自体はエンジンに依存しない。
  retry・timeout増加、しきい値の緩和、プロダクト実装の変更は行わない
- local-only反復は当該specがmobile projectで10/10 × 5回＝50/50 pass。
  続けて実行したlocal full suiteも0 failedで完走した

`semantic-ui-state.spec.ts` も `getComputedStyle(body).backgroundColor` を直接読んでおり、
同じ「emulateMedia → goto」順序のため理屈上は同じ報告不整合を踏みうる。踏んだ場合は
`expectAaContrast` が背景を透明として扱い1.15:1相当で誤検知する。ただし54回（18 × 3回）の
反復では再現しなかったため、#465では変更していない。再発時はここを最初に疑い、
まず`--project=mobile`単独で再現するかを確認する。

#465完了時点で、再現を確認できている既知flakyはない。

以前候補として記録していたlive detailのcarousel、calendarのhit-area、参加フォームのfocus連動は、
有効なローカル認証状態でのfull suite 5回では再観測されなかったため、既知flakyの一覧から外した。
再発時は `trace: "retain-on-failure"` の証跡で#440と同じ原因か独立原因かを分類し、独立原因だけを
別Issueにする。単独再実行1回のpass/failでは判定せず、`--repeat-each`で再現率を測る。

## 前提（認証セットアップ）

- dev server が起動していること: `pnpm dev`（`http://localhost:3001`。この認証セットアップでは
  ログイン画面へ到達するために dev で可）
- 通常の Google Chrome がインストールされていること
  - WSL: Windows 側の `C:\Program Files\Google\Chrome\Application\chrome.exe`
  - Linux: `/usr/bin/google-chrome`
- ローカル環境専用。CI では実行できない（スクリプトがエラーで停止する）

## 手順

1. `apps/oshikatsu-web` で認証セットアップを実行する

   ```bash
   pnpm playwright:auth
   ```

2. 専用プロファイルの Chrome が起動するので、その Chrome 上で手動 Google ログインを完了する
3. Sakalog のトップページが表示されたら、ターミナルに戻って Enter を押す
4. `playwright/.auth/user.json` に認証状態が保存される（パーミッション 600）

保存先の `playwright/.auth/` は gitignore 済みで、コミットされない。

## 認証状態が失効したら

保存済みの `storageState` は Supabase セッションの失効とともに使えなくなる
（対象ページがログインへリダイレクトされる）。その場合は同じ手順で
`pnpm playwright:auth` を再実行して作り直す。

### 失効は config が実行前に fail-fast する（#420）

`playwright/.auth/user.json` の access token は `supabase/config.toml` の
`jwt_expiry = 3600`（1時間）で失効する。**cookie 自体の `expires` は refresh token 由来で
約1年先を指すため、ファイルの見た目では失効に気づけない。**

Playwright は test ごとに新しい context へ同じ `storageState` を読み込むので、失効したまま
suite を回すと**全 test がそれぞれ token refresh を発火**し、
`[auth.rate_limit] token_refresh = 150`（5分 / IP）を超えて 429 に到達する。このとき
症状は「ページが描画されず待機系 assertion が timeout する」形で出るため、
一見すると対象機能の不具合や flaky に見え、**失敗する test が run ごとに移動する**（#418）。

これを timeout 延長 / retry / rate limit 引き上げで隠さないため、`playwright.config.ts` が
**suite 開始前に**認証状態を検証して fail-fast する。

- 判定は config のモジュールスコープで行う。`globalSetup` は webServer（`build + start`）の**後**に
  走るため、そこに置くと失効を知るまで build を待たされる（Playwright は plugin setup =
  webServer を globalSetup より先に実行する）。`resolveFixedToday` と同じ fail-fast の置き場所。
- **残り有効期間が15分未満なら実行しない。** full suite は実測約5.6分、build を含めて約8分。
  実行中の失効を防ぎつつ、発行から最初の45分は使える閾値。
- 失効・ファイル欠損・形式不正はそれぞれ理由を明示して落ち、`playwright:auth` の再実行を案内する。
- `CI`（`storageState` 未使用）と `--list`（収集のみ・server も起動しない）では検証しない。

パース処理（chunk 連結・`base64-` prefix・`expires_at` 取り出し）は `playwright/authState.ts` にあり、
`playwright/authState.test.ts` の vitest unit test で検証する（`pnpm test:unit`）。
`playwright/` 配下は E2E 本体（`*.spec.ts`）と補助モジュールの unit test（`*.test.ts`）が同居するため、
Playwright 側は `testMatch: "**/*.spec.ts"` で E2E だけを収集する。

## 仕組み

- `auth-setup.mjs` が専用 `user-data-dir` の Chrome を CDP ポート 9222 付きで起動する
- WSL + Windows Chrome の場合、Chrome の CDP は `127.0.0.1` にしかバインドされないため、
  `cdp-relay.ps1` が Windows 側で「WSL から届くアドレス:9223 → 127.0.0.1:9222」を中継する
  - relay は1接続だけを中継し、スクリプト終了時に必ず停止する。
    30秒以内に接続がなければ自動終了し、listen ポートを残さない
- 手動ログイン完了後、`chromium.connectOverCDP` で接続し、
  認証済み `BrowserContext` の `storageState()` を保存する
  （保存先ディレクトリ 700 / ファイル 600）

## 利用側

- `playwright.config.ts` が `playwright/.auth/user.json` を `storageState` として参照する
  （CI では参照しない）
- プロジェクトは `desktop`（Desktop Chrome）と `mobile`（iPhone 17 / WebKit）の2つ

## 関連ドキュメント

- Design Audit の流れと保存先: `rules/sakalog.md`「Design Auditの保存と利用」、
  `docs/advisor/design/README.md`
