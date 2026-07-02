# oshikatsu-web 現状調査とリファクタリング計画

作成日: 2026-07-02
対象: `apps/oshikatsu-web`（+ `packages/supabase`）
調査時点のブランチ: `feature/207-video-calendar-events`

## 調査観点

依頼時の観点（優先順位順）に、調査中に追加した観点を加えた。テストは対象外。

1. セキュリティ（認証・認可含む）
2. データアクセス
3. アーキテクチャ・共通化
4. UI設計・状態管理
5. パフォーマンス
6. （追加）型安全性・エラーバウンダリ・可観測性・依存パッケージ健全性

## 総評

全体としてかなり健全なコードベース。レイヤー分離（UI → UseCase → Repository）は
`rules/architecture.md` 通りに守られており、typecheck も通過、`any` はゼロ。
ADR も整備されている。大規模な作り直しは不要で、リファクタリングは
「認可の強化」「DB型生成の導入」「巨大フォームの分割」の3点に絞るのが妥当。

---

## 1. セキュリティ

### 良い点（コードから確認済み）

- 全テーブルで RLS 有効（`002_orbit_rls_policies.sql` ほか）。
  Storage ポリシーも object key prefix 制約で強化済み（`014_harden_member_image_storage_policies.sql`）
- Server Action は全て `supabase.auth.getUser()` で認証を再チェックし、
  書き込みはセッション付きクライアント（RLS適用）で実行
- proxy.ts（middleware）は `routeMergeMode: "replace"` で `/login` `/auth` 以外を全て保護
  （トップ `/` も保護対象）
- auth callback にオープンリダイレクト対策あり（`/` 始まりかつ `//` 以外のみ許可）
- `.env.local` は gitignore 済み
- `dangerouslySetInnerHTML` 不使用。`lib/linkParser.ts` は `http(s)` のみ許可で
  `javascript:` URL を弾く

### 指摘事項

1. **【最重要】認可が「ログイン済み = フル管理者」の一段階のみ**
   - RLS は `auth.role() = 'authenticated'` のみで、コード上にメール allowlist や
     ロール判定が一切ない
   - Google OAuth のため、Supabase 側で新規サインアップを止めていない限り、
     誰でも Google アカウントでログインして全データを書き換え・削除できる
   - Supabase ダッシュボードの "Allow new users to sign up" 設定はコードから
     確認できないため、まずそこの確認が必要
   - **2026-07-02 確認済み: "Allow new users to sign up" は OFF**。入口は塞がっており
     緊急性は下がったが、防御がダッシュボード設定の一層のみのため RLS 側の防御を追加する（#213）
2. **`createReadOnlyClient` は名前に反して read-only ではない**
   - `packages/supabase/src/read-only-server.ts` は service role キーを使うため
     RLS を完全にバイパスし、書き込みも技術的には可能
   - ADR 0006 で意図的な決定と確認済みだが、「規律で守っている」だけで
     機構的な歯止めがない
3. （軽微）callback の `next` 検証は `//` は弾くが `/\evil.com` 形式
   （ブラウザが `\` を `/` に正規化する）が通る
4. （軽微）middleware の public 判定が `startsWith("/login")` の前方一致のため
   `/loginfoo` のようなパスも public になる

## 2. データアクセス

### 良い点

- Repository インターフェース（`types/repositories.ts`）+ ページでの DI
- Supabase エラーを `RepositoryError` に変換、UseCase は `Result` 型を返す
- 複数テーブル更新はトランザクション RPC に集約
- FK インデックス追加・RLS 呼び出し最適化の migration も整備済み（008, 009, 024, 028）

### 指摘事項

1. **Supabase の生成型（`supabase gen types`）を使っていない**（最大の改善点）
   - `SupabaseClient` に `Database` 型ジェネリクスがなく、リレーションの返り型を
     手書きの `T | T[]` union で表現
   - `Array.isArray` による正規化が 19 箇所、`as` キャストが各リポジトリ合計約 60 箇所
   - スキーマ変更時に型とクエリ文字列がずれても検知できない
2. **リポジトリの肥大化**
   - `songRepository.ts`（1,043行）、`releaseRepository.ts`（1,037行）
   - 大半が select 文字列と行→ドメイン型のマッピングで、mapper 分離の余地あり

## 3. アーキテクチャ・共通化

- 依存方向の違反はほぼゼロ
  （`components/layout/Header.tsx` がログアウトで supabase client を直接使うのみ。許容範囲）
- `usecases/readOrbitData.ts`（349行）が全ページローダーの集約点として成長中。
  将来的にドメイン別分割の余地あり
- household-web との UI 部品重複（Button/Input/Select）はあるが規模が小さく、
  共通パッケージ化は現時点では過剰と判断

## 4. UI設計・状態管理

### 指摘事項

1. **管理フォームの巨大化**（UI面の最大課題）
   - `SongForm.tsx` 1,449行、`ReleaseForm.tsx` 1,006行、`LiveForm.tsx` 915行、
     `MemberForm.tsx` 714行
   - 全フォームで `errors: Record<string, string>` / `isSubmitting` / submit フロー /
     `_key` 付き配列フィールド / Combobox クエリ state という同じパターンを手書きで反復
2. **エラーバウンダリがほぼ無い**
   - `error.tsx` は `songs/[id]` の 1 箇所のみ
   - ルートの `error.tsx` / `not-found.tsx` が無い
     （`notFound()` は 13 箇所で呼んでいるのにカスタム 404 が無い）

## 5. パフォーマンス

問題なし。ADR 0006 の共有 read cache（`unstable_cache` + タグ失効）、
公開一覧用の軽量 DTO 分離、`Promise.all` 集約、`next/image` 使用と、
個人アプリとしては十分以上。

- 一覧の絞り込みは「全件取得 + クライアントフィルタ」だが現在のデータ規模では妥当。
  数千件規模になったら再検討で十分

## 6. 追加観点：可観測性・依存

- エラーは `console.error` のみ（4箇所）で監視ツールなし。個人アプリなので必須ではないが、
  ホスティング側でサーバーログが見られることは確認しておく
- 依存は Next 16.1.6 / React 19.2.3 / supabase-js ^2.98 と新しく、健全

---

## リファクタリング計画（優先順）

| # | Issue | 内容 | 規模 | 効果 |
|---|-------|------|------|------|
| P1-1 | #213 | **認可強化**: メール allowlist / `app_metadata` ロールを RLS で判定（多層防御。サインアップ OFF 確認済みのため緊急性は中） | 小 | 高 |
| P1-2 | #214 | callback の `next` 検証にバックスラッシュ拒否を追加、middleware の public 判定を厳密化 | 極小 | 中 |
| P1-3（任意） | #215 | `createReadOnlyClient` の返り値型を select 系のみ公開する型でラップし、書き込み誤用をコンパイル時に防ぐ | 小 | 中 |
| P2-1 | #216 | **Supabase 生成型の導入**: `packages/supabase` に `Database` 型を追加し、リポジトリを 1 つずつ typed client 化。`T\|T[]` union と `as` キャストを段階的に除去 | 中（リポジトリ単位で分割可能） | 高 |
| P2-2 | #217 | song/release リポジトリを「クエリ + mapper」に分割 | 小〜中 | 中（P2-1 と同時が効率的） |
| P3-1 | #218 | **フォーム共通化**: `useAdminForm`（errors/isSubmitting/submit フロー）+ keyed 配列ヘルパー + エラー表示部品を抽出 → SongForm/ReleaseForm をセクション単位に分割 | 中 | 高（保守性） |
| P3-2 | #219 | ルート `error.tsx` / `not-found.tsx` の追加 | 極小 | 中 |

## Issue 化状況（2026-07-02 確認）

監査結果の改善項目はすべて GitHub Issue 化済み。

| Issue | 状態 | 対応項目 |
|-------|------|----------|
| #213 | Open | 認可強化: RLS レイヤーでのオーナー限定アクセス（多層防御） |
| #214 | Open | auth callback の next 検証強化と middleware public 判定の厳密化 |
| #215 | Open | `createReadOnlyClient` を型レベルで read 専用にする |
| #216 | Open | Supabase 生成型（Database 型）の導入とリポジトリの段階移行 |
| #217 | Open | song/release リポジトリをクエリと mapper に分割 |
| #218 | Open | 管理フォームの共通化（useAdminForm）と SongForm/ReleaseForm の分割 |
| #219 | Open | ルート `error.tsx` / `not-found.tsx` の追加 |

関連ドキュメント:

- `docs/orbit-roadmap.md` の「技術的負債・既知の制限」にバックログとして反映済み
- `docs/ai/PROJECT.md` の RLS 方針に #213 を追記済み
- `docs/decisions/0006-orbit-read-cache-strategy.md` に #215 を追記済み

### 進め方

- P1 はまとめて 1 Issue/PR で完了できる規模
- P2-1 は「型生成の基盤導入」→「リポジトリごとに移行」と Issue を分けると差分を小さく保てる
- P3-1 はフォームライブラリ導入（react-hook-form + zod）という選択肢もあるが、
  「新規ライブラリ最小限」方針（CLAUDE.md）に沿うなら手書きパターンの共通化で十分
- 最初の着手は P1-1（Supabase のサインアップ設定確認 + allowlist）
