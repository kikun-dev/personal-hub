# ADR 0002: Supabase の採用（DB + 認証）

## Status
Accepted

## Context（背景）

personal-hub では家計管理アプリ（household-web）を最初のアプリとして開発する。
データの永続化とユーザー認証が必要。

要件:
- Google ログインによる認証
- PostgreSQL 互換のリレーショナル DB
- Row Level Security（RLS）によるユーザーデータ分離
- 個人開発での運用コスト最小化
- スマホからもアクセス可能（クラウド DB 必須）

---

## Decision（決定）

**Supabase** を採用する（PostgreSQL + Auth + Realtime の統合 BaaS）。

### 採用理由
- 認証・DB・RLS が統合されており初期コストが低い
- PostgreSQL の型安全な TypeScript 型生成が可能（`supabase gen types`）
- Next.js との公式 SSR ライブラリ（`@supabase/ssr`）あり
- 無料枠で個人開発に十分

### 導入ライブラリ
| ライブラリ | 役割 |
|---|---|
| `@supabase/supabase-js` | Supabase 公式クライアント |
| `@supabase/ssr` | Next.js SSR 用セッション管理 |

---

## Alternatives Considered（検討した代替案）

### Firebase（Firestore + Firebase Auth）
- NoSQL（Firestore）のためリレーショナルなクエリが弱い
- 家計データのような集計・フィルタが多いデータには不向き
- → 採用しない

### 自前 PostgreSQL + NextAuth.js
- 柔軟性は最大
- インフラ管理コストが高い（個人開発には過剰）
- 認証も自前でセットアップが必要
- → 採用しない

---

## Consequences（結果・影響）

### 良い点
- 認証・DB・RLS が統合されており初期コストが低い
- PostgreSQL の型安全な TS 型生成が可能
- 無料枠で個人開発に十分
- スマホからのアクセスが自然に実現

### 悪い点
- Supabase へのベンダーロック（移行コスト）
- Repository 層で Supabase を抽象化することで影響を最小化する
- 無料枠の制限（500MB DB、50,000 月間アクティブユーザー）

---

## Review Trigger（見直し条件）

以下が発生した場合、この ADR を見直す：

- Supabase の無料枠では不足する規模になった場合
- オフライン対応が必須になった場合
- Supabase のサービス継続性に懸念が生じた場合

---

## Notes

Repository 層で Supabase クライアントを抽象化するため、
将来の移行時はリポジトリ実装の差し替えのみで済む設計とする。
