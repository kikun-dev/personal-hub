# oshikatsu-web 現状調査とリファクタリング計画（第2回）

作成日: 2026-07-07
対象: `apps/oshikatsu-web`（+ `packages/supabase`、`apps/household-web` は横断確認のみ）
調査時点のブランチ: `refactor/298-image-infra`
前回監査: `006-oshikatsu-web-current-state-audit.md`（2026-07-02）

## 調査観点

依頼時の観点（優先順位順）に、調査中に追加した観点を加えた。テストは対象外。

1. セキュリティ（認証・認可、RLS、Server Actions のガード、環境変数・キーの扱い）
2. データアクセス（クエリの重複・N+1、キャッシュ戦略の一貫性、非アトミック更新）
3. アーキテクチャ・共通化（層分離、repository/フォームの重複、usecase の粒度）
4. UI設計・状態管理（URL params と useState の使い分け、コンポーネント分割）
5. パフォーマンス（payload サイズ、往復回数、キャッシュヒット、バンドル）
6. （追加）ドキュメント整合・可観測性・依存パッケージ健全性

## 総評

**前回監査（006）の指摘 8 件（#213〜#219、#221）はすべて解消済みで、コード上で確認できた。**
その後に追加された大型機能（参戦記録 / セットリスト / 聖地マップ / ロール体系）も、
既存の規律（ADR での決定 → RLS + アプリ境界の多層防御 → トランザクション RPC →
`Result` 型 + typed client）に沿って実装されており、監査で見つかる欠陥の水準が
前回から一段上がっている。typecheck / lint は両アプリで通過、`any` はゼロ。

今回の指摘は「バグ・脆弱性」ではなく、**(a) ドキュメントの追従漏れ、
(b) ダッシュボード側でしか確認できない運用設定、(c) 新機能で再発しつつある
既知パターン（フォーム肥大化・集約点の成長）** の3種に収まる。大規模な
リファクタリングは不要で、P1 は実質ドキュメント同期のみ。

---

## 0. 前回指摘の追跡（改善済み / 残存 / 新規の区別）

| 前回指摘 | Issue | 状態 | 確認箇所 |
|---|---|---|---|
| 認可が authenticated 一段階のみ | #213 / #221 | ✅ **改善済み** | migration 045/046（`is_orbit_admin()` / `has_orbit_read_role()`）、`proxy.ts` の `allowedRoles: ["admin","viewer"]` + `/admin` roleGuard、`lib/requireAdmin.ts` / `lib/requireOrbitUser.ts` |
| callback の `\` 検証・public 判定の前方一致 | #214 | ✅ 改善済み | `packages/supabase/src/auth-callback.ts:13-15`、`middleware.ts:23-25`（セグメント境界判定） |
| `createReadOnlyClient` が型レベル read-only でない | #215 | ✅ 改善済み | `read-only-server.ts:28`（返り値を `ReadOnlySupabaseClient` に限定） |
| Supabase 生成型未導入 | #216 | ✅ 改善済み | `packages/supabase/src/database.types.ts`（2,078行）、`Array.isArray` 正規化は 0 箇所、`as` は 29 箇所に減少（残りは CHECK 制約列の enum 絞り込みでコメント付き。健全な残余） |
| song/release リポジトリ肥大化（1,043 / 1,037 行） | #217 | ✅ 改善済み | `songRepository.ts` 574行 + `songMapper.ts` 504行、`releaseRepository.ts` 646行 + `releaseMapper.ts` 296行 |
| 管理フォームの手書きパターン反復（SongForm 1,449行） | #218 | ✅ 改善済み | `hooks/useAdminForm.ts` + `lib/keyedList.ts` + `FormErrorBanner` を管理系全8フォーム + `AttendanceControl` / `SetlistEditor` に適用。SongForm は 748 行に半減しセクション分割済み |
| ルート error / not-found 未整備 | #219 | ✅ 改善済み | `app/error.tsx` / `app/not-found.tsx` あり |
| `readOrbitData.ts` の集約点成長（349行） | （備考扱い） | ⚠️ **残存** | 402 行・ページローダー 12 個に成長（→ P3-2） |
| 監視ツールなし（console.error のみ） | （備考扱い） | ⚠️ 残存 | `console.error` 5箇所（digest 付きで前回より構造化）。個人アプリのため必須ではない判断は前回どおり |

---

## 1. セキュリティ

### 良い点（コードから確認済み）

- **認可が3層の多層防御になった**:
  1. proxy（middleware）: `allowedRoles: ["admin","viewer"]` で全保護ルートを遮断、
     `/admin` 配下は roleGuard で admin のみ（`apps/oshikatsu-web/proxy.ts`）
  2. Server Action 入口: 書き込み系は `requireAdmin()`、ユーザー別データは
     `requireOrbitUser()`。全 Server Action ファイルを走査し、ガード漏れゼロを確認
     （`/admin` 配下 page.tsx の inline action はガード済み action の薄いラッパーのみ）
  3. RLS: 書き込みは `is_orbit_admin()`、閲覧は `has_orbit_read_role()`（045/046）。
     参戦記録は加えて `user_id = auth.uid()` の本人限定（047）
- **書き込みUIが `/admin` 外にもある**（/spots, /venues, /people, セトリ編集）が、
  該当 action はすべて `requireAdmin` を通り、RLS でも二重に守られている
- 参戦記録の `user_id` はクライアント入力を信用せず、サーバー側 `getUser()` の
  結果のみを使う（ADR 0009 の決定どおり。`lives/[id]/actions.ts:20-25`）。
  `performanceId` の UUID 検証も境界で実施
- Storage: spot-photos バケットは mime 3種 + 5MB 上限 + `spots/` prefix +
  `is_orbit_admin()` の書き込みポリシー（migration 058。member-images の 013/014 と同型）
- object path は `..` / 先頭 `/` / `https://` を拒否し、URL 生成前に検証
  （`lib/storageImage.ts:36-43`）
- スポットの外部リンク（`googleMapsUrl` / appearance の `linkUrl`）は
  `isValidHttpUrl` で http(s) のみ許可（`usecases/validateSpot.ts:71,156`）。
  `javascript:` スキームは通らない。`dangerouslySetInnerHTML` は引き続きゼロ
- household-web は `allowedRoles: ["admin"]` で viewer からも遮断（#244）
- `.env.local` は gitignore 済み。service role キーのコード上の使用箇所は
  `createReadOnlyClient` のみ（型レベル read-only 化済み）

### 指摘事項

1. **【コード外】Google Maps API キーの制限設定**
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` はクライアントに露出する設計上公開のキーで、
     ADR 0010 は「HTTP リファラ制限と予算アラートを必ず設定する」を採用条件にしている
   - Google Cloud 側の設定はコードから確認できないため監査時点では「要確認」としたが、
     **2026-07-07 確認済み: リファラ制限・予算アラートとも設定済み**（ADR 0010 に追記）
2. （情報・判断済みの前提確認）**画像バケットは public**
   - member-images / spot-photos は public バケットで、URL を知っていれば
     未ログインでも画像自体は閲覧できる（RLS はメタデータ側のみ）
   - 045 の方針（「バケットは public のため SELECT ポリシー不要」）として意図的な決定。
     スポット写真（自分で撮影した写真）を含めてこの前提で良いかだけ再確認しておく

## 2. データアクセス

### 良い点

- **新規リポジトリ（attendance / spot / setlist）も既存の規律に完全準拠**:
  `SelectRows<Table, typeof SELECT>` による select 文字列からの型導出、
  `RepositoryError` 変換、UseCase の `Result` 型
- N+1 なし。参戦記録は「参加記録 + 公演 + ライブ + 会場 + 出演グループ」を
  ネスト select 1クエリで取得し、集計はアプリ側の純関数
  （`getAttendanceStats.ts`。RPC ではなくアプリ集計にした決定は Issue #249 に記録）
- 非アトミック更新の解消が進んだ: spot は `upsert_orbit_spot` RPC（059、#289）、
  セトリは `replace_performance_setlist`（052）、live は `upsert_orbit_live`（031）
- キャッシュ戦略は一貫: 共有データは `createSharedReadLoader`
  （`unstable_cache` + タグ）、ユーザー別データ（参戦記録）は shared cache 対象外
  （ADR 0009）と、載せる/載せないの判断基準が明文化されている

### 指摘事項

1. **（残存・小）event の create だけが補償削除方式のまま**
   - `eventRepository.ts:249-308` は event 挿入 → groups / members 挿入で、
     失敗時に event を削除する補償処理。update は RPC 化済み（015）なので、
     書き込み系で唯一の非 RPC 複数リクエスト
   - spot で確立した upsert RPC パターン（059）をそのまま適用できる
2. **（新規・小）`revalidateOrbit.ts` のタグ依存マトリクスが手書きで成長中**
   - 「メンバー更新 → スポット詳細も失効（出来事のメンバー名を表示するため）」の類の
     エンティティ間依存が、各 `revalidateOrbitXxxData()` にコメント付きで
     手書きされている。現状は正しいが、参照関係が増えるたびに失効漏れの
     リスクが上がる構造（表示参照を増やした PR がタグ追加を忘れても検知できない）
   - 「タグ → 依存タグ」の宣言的な表に寄せると、追加時の考慮点が1箇所になる
3. （備考）`personRepository` の一括 role マージ（`personRepository.ts:243-273`）は
   人物ごとのループ update。対象は数件規模なので現状問題なし

## 3. アーキテクチャ・共通化

### 良い点

- 層の依存方向違反は前回同様ほぼゼロ（UI → UseCase → Repository を維持）
- 画像アップロード基盤の3重複が共通化された（#298、調査時点のブランチ）:
  `lib/storageImage.ts` + `repositories/storageImageRepository.ts` に共通コアを置き、
  ドメイン差分だけを各 lib に残す構成
- ソート・keyed 配列・エラーバナー等の横断ヘルパーが `lib/` / `hooks/` に集約され、
  新機能（spot / setlist / attendance）が最初からそれを使っている

### 指摘事項

1. **（残存）`usecases/readOrbitData.ts` が集約点として成長継続**（349 → 402行、ローダー12個）
   - 全ローダーが同じ構造（`createSharedReadLoader` + `withOrbitReadClient`）なので
     可読性はまだ保たれているが、ページ追加のたびに単調増加する
   - ドメイン別（music / live / spot / venue）への分割は機械的にできる
2. household-web との UI 部品重複は前回同様、規模が小さく共通パッケージ化は不要
   （household-web は合計 2,119 行で安定）

## 4. UI設計・状態管理

### 良い点

- 一覧の絞り込み状態は URL search params に統一されている
  （SongBrowser / MemberBrowser / ReleaseBrowser / LiveBrowser / SpotsMapView /
  AttendanceStats / SetlistCountBrowser の7箇所で `searchParams` を使用。
  `useState` はフォーム入力とUIローカル状態に限定されており、使い分けが明確）
- `useAdminForm` + `keyedList` + `FormErrorBanner` が管理系全フォームに適用済み
- Google Maps 系はクライアント境界が明確（`GoogleMapsProvider` 配下のみ。
  サーバー専用 usecase からは `import type` で型だけ取り出す規律もコメントで明文化）

### 指摘事項

1. **（新規・既知パターンの再発）`SpotForm.tsx` が 728 行で最大のフォームに**
   - 共通基盤（useAdminForm / keyedList）は使っているが、セクション分割は
     `SpotPhotosSection` のみで、登場記録（appearances）・場所検索・住所フィールドが
     本体に同居している
   - SongForm で確立した「セクションコンポーネント + FormValues 分離」
     （`components/admin/song/`）と同じ構成に揃えるのが自然
   - `SetlistEditor.tsx`（686行）も同傾向だが、こちらは編集ビュー全体で1責務と
     見なせる範囲。次に手を入れる時に分割を検討で十分

## 5. パフォーマンス

問題なし（前回から改善）。

- 共有 read cache（ADR 0006）がスポットにも適用済み。タグ失効の粒度も一覧/詳細で分離
- 写真アップロードは base64 経由の Server Action で、`bodySizeLimit: "8mb"` と
  Storage 側 5MB 上限が整合している（`next.config.ts`）
- Google Maps のバンドルは spots ページのみでロード。`next/image` を全面使用
  （生の `<img>` はゼロ）
- 「全件取得 + クライアントフィルタ」は前回同様、現在のデータ規模では妥当

## 6. 追加観点：ドキュメント整合・依存

### 指摘事項

1. **【P1・新規】`docs/orbit-roadmap.md` の技術的負債表が実態から遅れている**
   - #214 / #215 / #216 / #217 / #218 / #219 / #221 の行が「対応予定」のまま
     （すべてクローズ済み）。「Repository update 非アトミック」行も
     event create の補償処理を除き解消済み
   - 前回監査ドキュメント（006）の「Issue 化状況」も全件 Open 表記のまま
   - **→ 本監査で roadmap の表は更新済み**（006 は履歴スナップショットとしてそのまま）
2. 依存は健全。minor/patch の更新余地あり（supabase-js 2.98→2.110、
   next 16.1.6→16.2.10、eslint はメジャー 9→10 が出ている）。`/deps-update` で
   定期消化すれば十分

---

## リファクタリング計画（優先順）

前回と異なり緊急度の高い項目はない。P1 はドキュメント・運用確認のみ。

| # | Issue | 内容 | 規模 | 効果 |
|---|-------|------|------|------|
| P1-1 | - | **ドキュメント同期**: roadmap 負債表の更新（本監査で対応済み）+ 本監査ドキュメントの反映 | 極小 | 中（判断材料の鮮度） |
| P1-2 | - | **【運用】Google Maps API キーのリファラ制限・予算アラートの設定確認**（ADR 0010 の採用条件）→ **2026-07-07 設定済みを確認**、ADR 0010 に追記 | 極小 | 高（未設定なら課金リスク） |
| P2-1 | #303 | **SpotForm のセクション分割**: `components/admin/spot/` 配下へ appearances / 場所検索 / 基本情報を分離（SongForm と同構成に） | 小〜中 | 中（保守性・パターン統一） |
| P2-2 | #304 | **event create のトランザクション RPC 化**: `upsert_orbit_spot`（059）と同型の RPC に置き換え、最後の補償削除方式を廃止 | 小 | 中（整合性・パターン統一） |
| P3-1 | #305 | `revalidateOrbit.ts` のタグ依存を宣言的な依存表に再構成（失効漏れの構造的予防） | 小 | 中 |
| P3-2 | #306 | `readOrbitData.ts` のドメイン別分割（music / live / spot / venue） | 小 | 低〜中（単調成長の抑制） |
| P3-3 | - | 依存パッケージの定期更新（`/deps-update` で随時消化。eslint 10 はメジャーのため別途判断。Issue 化はしない） | 極小 | 低 |

### 進め方

- P2-1 と P2-2 は独立しており、どちらも 1 Issue / 1 PR の規模
- P3 は次にその周辺を触る機会に同乗させる程度で十分

## Issue 化状況（2026-07-07 起票済み）

| Issue | 状態 | 対応項目 |
|-------|------|----------|
| #303 | Open | SpotForm をセクション単位に分割する（SongForm と同構成に） |
| #304 | Open | event create をトランザクション RPC 化し補償削除方式を廃止する |
| #305 | Open | revalidateOrbit のタグ依存を宣言的な依存表に再構成する |
| #306 | Open | readOrbitData.ts をドメイン別に分割する |

関連ドキュメント:

- `docs/orbit-roadmap.md` の技術的負債表: 本監査で解消済み行を更新、新規負債を追記
- `docs/decisions/0010-orbit-seichi-map-google-maps.md`: キー制限の設定確認を追記
- 前回監査: `docs/advisor/006-oshikatsu-web-current-state-audit.md`（指摘は全件解消）
