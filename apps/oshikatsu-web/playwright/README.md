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

対策は発生源側で、`components/events/CalendarDateLink.tsx` が `prefetch={false}` を指定している。
**カレンダーの日付リンクへ prefetch を戻さないこと。**

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

### 既知の flaky test（解消済みではない）

> **注記（#420）**: 下記の記録は、認証状態の失効による 429（後述「失効は config が実行前に
> fail-fast する」）が判明する前のもの。「分離実行では pass するが full suite で単発 fail する」
> という症状は 429 でも同じ形で出るため、**この一覧の一部はそれで説明できる可能性がある**。
> 有効な認証状態で改めて観測し直すまで一覧は残す（未再観測のまま削除しない）。

> **注記（#440）**: 「いずれも分離実行では pass」という下記の前提は**誤り**だった。#440 で
> 観測した失敗を単体で40回反復したところ 1回（2.5%）再現した。**単独再実行が1回 pass しても
> flaky と断定する根拠にはならない。** 再現率を測るときは `--repeat-each` を使う。認証チェックは
> プロセス開始時の1回で済むので、反復あたりのコストが低い。
>
> ```bash
> E2E_REUSE_SERVER=1 E2E_FIXED_TODAY=2026-08-23 \
>   pnpm exec playwright test playwright/<spec>.spec.ts -g "<test名>" --repeat-each=20
> ```

`workers: 1` + build+start でフレークは大幅に減ったが、focus / animation / carousel の timing に
敏感な次の test は**まれに単発 fail する**（CI の `retries: 1` が吸収）。
恒久対策（timing の安定化）は未了で、ここに記録して追跡する。

- `live-detail-attendance-density.spec.ts`（carousel の keyboard / focus 追従: `:239` `:310` `:371` `:405` 付近）
- `calendar-narrow-interaction.spec.ts:87`（1440px での hit-area 計測、mobile）
- `attendance-form-a11y.spec.ts:110`（field error と focus 連動、mobile）

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
