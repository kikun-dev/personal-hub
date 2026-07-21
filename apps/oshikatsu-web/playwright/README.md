# Playwright 認証状態のセットアップ

Design Audit / Design QA で Playwright から認証済み画面を確認するための
`storageState`（`playwright/.auth/user.json`）を作成する手順。

Google OAuth のログイン操作は自動化せず、専用プロファイルの Chrome で
**手動ログインした結果だけ**を保存する。

## テスト実行（Design QA）

`playwright.config.ts` の `webServer` が **production build を start して配信**する（#413）。
`next dev` の on-demand compile が並列初回で timeout してフレークになるのを避けるため。

```bash
# apps/oshikatsu-web で
pnpm test:e2e             # = playwright test（webServer が build + start を自動実行）
pnpm test:e2e --list      # 収集のみ（実行しない）
pnpm test:e2e <spec名>    # 個別 spec
```

- `webServer.command = "pnpm build && pnpm start"`（`http://localhost:3001`）。実行前に build 時間が加わる。
- `reuseExistingServer` はローカルのみ true。**3001 で dev server が起動していると再利用され
  build + start にならない**（＝フレークが残る）。安定した full run が欲しいときは dev server を
  止めてから実行する。
- `retries: process.env.CI ? 1 : 0`（ローカルは retry せず実失敗を隠さない）。
- `workers: 1`（スイート全体を単一 worker で直列実行）。spec ファイル**間**の並列実行が prod
  サーバ + ローカル Supabase を過負荷にし、`RepositoryError` や timing 崩れでフレークの主因に
  なっていたため。全 test が順に走るので、失敗が「did not run」で隠れることもない。
  ※ 現在 `recent-attendance-isolation` 等は「今日の予定」データ有無に依存して fail し得る
  （#412 で解消予定）。それらは実失敗として表示される（他 test は隠さない）。
- テスト自体の timeout は変更していない（フレークの原因は compile 遅延・並列競合であり
  timeout 不足ではない）。
- 認証は下記 `storageState`（非 CI）を利用する。失効したら再作成する。

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
