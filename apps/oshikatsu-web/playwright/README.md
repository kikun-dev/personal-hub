# Playwright 認証状態のセットアップ

Design Audit / Design QA で Playwright から認証済み画面を確認するための
`storageState`（`playwright/.auth/user.json`）を作成する手順。

Google OAuth のログイン操作は自動化せず、専用プロファイルの Chrome で
**手動ログインした結果だけ**を保存する。

## 前提

- dev server が起動していること: `pnpm dev`（`http://localhost:3001`）
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
- 手動ログイン完了後、`chromium.connectOverCDP` で接続し、
  認証済み `BrowserContext` の `storageState()` を保存する

## 利用側

- `playwright.config.ts` が `playwright/.auth/user.json` を `storageState` として参照する
  （CI では参照しない）
- プロジェクトは `desktop`（Desktop Chrome）と `mobile`（Pixel 7）の2つ

## 関連ドキュメント

- Design Audit の流れと保存先: `rules/sakalog.md`「Design Auditの保存と利用」、
  `docs/advisor/design/README.md`
