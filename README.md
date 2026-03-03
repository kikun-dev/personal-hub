# personal-hub

個人の生活・推し活・タスクを一元管理するための統合プラットフォーム。
長期運用を前提に、迷わない構造・可読性・変更容易性を最優先に設計している。

------------------------------------------------------------------------

## Apps

  Directory              Brand    Description            Status
  ---------------------- -------- ---------------------- -------------
  `apps/household-web`   Ledger   支出特化型の家計管理   In Progress
  `apps/oshikatsu-web`   Orbit    推し活管理             Planned
  `apps/tasks-web`       Flow     タスク管理             Planned

------------------------------------------------------------------------

## Tech Stack

-   **Runtime**: Node.js 24
-   **Framework**: Next.js 16 (App Router) + TypeScript
-   **Styling**: Tailwind CSS 4
-   **Database / Auth**: Supabase (PostgreSQL + Google OAuth + RLS)
-   **Package Manager**: pnpm (workspaces)
-   **CI**: GitHub Actions

------------------------------------------------------------------------

## Requirements

-   Node.js 24.x
-   pnpm 9+

------------------------------------------------------------------------

## Setup

``` bash
nvm install
nvm use
pnpm install
```

------------------------------------------------------------------------

## Environment Variables

各アプリで `.env.local` を設定してください。

例（household-web）:

    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=

`.env.local` は Git 管理されません。

------------------------------------------------------------------------

## Development

``` bash
# 全アプリ起動
pnpm dev

# household-web のみ
pnpm --filter household-web dev

# 型チェック
pnpm --filter household-web typecheck

# Lint
pnpm --filter household-web lint
```

------------------------------------------------------------------------

## Repository Structure

    personal-hub/
      apps/
      packages/
      docs/
        ai/
        decisions/   ← ADR
      rules/
      .github/

------------------------------------------------------------------------

## Architecture Principles

-   可読性を最優先
-   UI / Domain / Data 層の責務分離
-   設計判断は ADR (`docs/decisions/`) に記録
-   小さな PR 単位で変更
-   `main` への直接 push は禁止（PR + CI 必須）

------------------------------------------------------------------------

## AI-Assisted Development

本プロジェクトは AI を活用した開発を行っている。

-   **Claude Code**: 設計提案 / 実装補助
-   **Codex**: PR レビュー / リファクタリング

AI は補助であり、最終判断は人間が行う。

詳細は `CLAUDE.md` を参照。
