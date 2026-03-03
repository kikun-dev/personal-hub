# ADR 0003: 状態管理方針

## Status
Accepted

## Context（背景）

household-web のフロントエンド状態管理について方針を決定する必要がある。
Next.js 16（App Router）+ React 19 環境。

管理すべき状態:
- サーバーデータ（取引一覧、カテゴリ、月次サマリー）
- フォーム入力状態
- 画面状態（選択中の月、収入/支出タブ）
- 認証状態

---

## Decision（決定）

**外部ライブラリを使わず、React 組み込み機能のみ** で状態管理する。

| 状態の種類 | 管理方法 |
|---|---|
| サーバーデータ | Server Components でデータ取得、props で渡す |
| ミューテーション | Server Actions |
| フォーム入力 | useState / useReducer |
| 画面状態（月選択等） | URL search params（`?year=2026&month=3`） |
| 認証状態 | Supabase Auth（ミドルウェアでセッション管理） |

---

## Alternatives Considered（検討した代替案）

### TanStack Query
- クライアントサイドキャッシュ + 自動再取得
- Server Components との併用が複雑になる
- 現時点ではオーバースペック
- → 採用しない

### Zustand / Jotai
- グローバル状態管理
- 現時点で共有すべきグローバル状態がない
- 認証状態は Supabase が管理
- → 採用しない

---

## Consequences（結果・影響）

### 良い点
- 依存ゼロ。バンドルサイズ最小
- Next.js App Router の設計思想と一致
- 学習コスト・デバッグコストが低い
- URL params による月選択で、URL 共有・ブラウザ戻るボタンが自然に動作

### 悪い点
- リアルタイム更新や複雑なキャッシュ無効化が必要になった場合、追加検討が必要

---

## Review Trigger（見直し条件）

以下が発生した場合、この ADR を見直す：

- リアルタイム同期が必要になった場合
- 複数ページで同じデータのキャッシュ共有が必要になった場合
- クライアントサイドの状態が複雑化した場合

---

## Notes

ミューテーション後のデータ更新は `router.refresh()` で
Server Component を再実行する方式を取る。
