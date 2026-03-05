# CI トリガー調査ログ（PRで GitHub Actions が起動しない件）

作成日: 2026-03-06  
対象ブランチ: `feature/top-date-selection`

## 1. 事象

- PR 作成時に GitHub Actions の CI（`CI - oshikatsu-web` / `CI - household-web`）が自動起動しない
- PR 上には Vercel のチェックのみ表示される

対象PR:
- 旧: https://github.com/kikun-dev/personal-hub/pull/41（クローズ）
- 新: https://github.com/kikun-dev/personal-hub/pull/42（再作成）

## 2. 実施した確認

### ワークフロー定義

- `.github/workflows/ci-oshikatsu-web.yml`
- `.github/workflows/ci-household-web.yml`

確認結果:
- `pull_request` トリガー定義あり
- `paths` 条件あり
- 今回変更ファイル（`apps/oshikatsu-web/**`）は `paths` 条件に一致

### GitHub 側設定

確認結果:
- Actions permissions: `enabled=true`
- allowed actions: `all`
- workflow state: 両CIとも `active`

### 実行履歴/API

確認結果:
- `event=pull_request` + `branch=feature/top-date-selection` の runs は `total_count: 0`
- つまり PR イベントに対する Actions run 自体が作成されていない

## 3. 切り分け対応

### A. 再発火用コミット

- `apps/oshikatsu-web/**` 配下に最小差分コミットを追加
- 結果: `pull_request` run は生成されず

### B. PR close/reopen

- PR #41 を close/reopen
- 結果: `pull_request` run は生成されず

### C. PR 作り直し

- PR #41 をクローズし、同ブランチで PR #42 を新規作成
- 結果: PR #42 でも `pull_request` run は生成されず

### D. 手動実行によるCI実行可否確認

`workflow_dispatch` を CI workflow に追加:
- commit: `ad9329d`
- 変更:
  - `.github/workflows/ci-oshikatsu-web.yml`
  - `.github/workflows/ci-household-web.yml`

手動実行結果:
- `CI - oshikatsu-web` run `22728705601`: success
- `CI - household-web` run `22728706585`: success

解釈:
- CIジョブ自体は正常
- 問題は `pull_request` イベントによる自動トリガー経路に限定される

## 4. 仮説

- GitHub Actions / Checks 側の一時的不調またはイベント処理取りこぼし
- 以前観測した Runner 側 Internal Server Error（Correlation ID 付き）と同系統の可能性あり

## 5. 暫定対応と次アクション

暫定対応:
- `workflow_dispatch` 追加済みのため、PR上の自動起動が失敗する場合でも手動で CI 実行可能

次アクション候補:
1. GitHub Status（Actions / Checks / Webhooks）確認
2. Repository / Organization の Rulesets 再確認
3. Webhook delivery（`pull_request opened/reopened/synchronize`）確認
4. 必要なら GitHub Support へ問い合わせ（Correlation ID, PR URL, run ID を添付）
