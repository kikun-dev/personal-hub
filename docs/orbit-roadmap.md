# Orbit ロードマップ

## Phase 1: メンバー管理 + トップページ（PR #29）

### 完了済み

- [x] DB スキーマ（7テーブル + RLS + Seed）
- [x] プロジェクトスキャフォールド（`oshikatu-web` → `oshikatsu-web` リネーム含む）
- [x] 認証（`@personal-hub/supabase` 共有パッケージ使用）
- [x] 型定義（group, member, event, eventType, repositories, errors, result）
- [x] Repository 層（group, member, event, eventType）
- [x] UseCase 層（CRUD + validation + カレンダー系）
- [x] UI コンポーネント（Button, Input, Select, Textarea, Badge, Card, GroupBadge）
- [x] メンバー一覧・詳細ページ
- [x] メンバー管理画面（CRUD）
- [x] トップページ（カレンダー + 今日のイベント + 今日はなんの日）
- [x] イベント管理画面（CRUD）
- [x] CI ワークフロー（`ci-oshikatsu-web.yml`）
- [x] ローカル動作確認

### 未完了（マージ前後の対応）

- [x] Supabase で SQL マイグレーション実行（001〜003）
- [x] PR #29 レビュー・マージ
- [x] Vercel デプロイ設定（oshikatsu-web）
- [x] Supabase Dashboard で本番 Redirect URL 追加
- [ ] メンバーデータの初期投入

---

## Phase 1.5: 改善・安定化（Issue #30）

### 完了済み

- [x] カレンダー月切り替え時のサーバーデータ再取得（URL search params + MonthSelector）
- [x] 誕生日/OnThisDay クエリの RPC 関数化（Postgres 関数 3 つ作成）
- [x] `next/image` への移行（Supabase Storage `remotePatterns` 設定）
- [x] メンバー一覧のソート強化（現役→OG 順）
- [x] Header のモバイル対応（ハンバーガーメニュー）
- [x] Admin events ページに月ナビゲーション追加
- [x] MemberForm のグループ子フォームに安定した React key を使用
- [x] `MemberFilters` / MonthSelector の `Suspense` に fallback 追加

### 未完了（マージ前後の対応）

- [x] Supabase で SQL マイグレーション実行（004）

### 残タスク（バリデーション強化）— Issue #32 → PR #35 で対応済み

- [x] テキストフィールドの最大長チェック追加（P1: DB 側も TEXT 制約なし）
- [x] `validateEvent` で `endDate >= date` チェック追加（P1）
- [x] `heightCm` の範囲チェック追加（P1: 0 < x < 300）
- [x] `bloodType` のサーバーサイドバリデーション追加（P2）
- [x] `dateOfBirth` のフォーマットバリデーション追加（P2）

### 残タスク（コード品質）— Issue #32 → PR #35 で一部対応済み

- [x] `GROUP_COLORS` 定数の使用状況確認・整理（P2: 未使用のため削除）
- [x] `groupRepository`, `eventTypeRepository` の `select("*")` を明示的カラム指定に変更（P2）
- [x] Repository update の非アトミック操作を RPC 関数でトランザクション化（Issue #33）
- [x] Issue #27 の改善項目（Supabase 共有パッケージ）

### 残タスク（UI/設定）— Issue #32 → PR #35 / Issue #33

- [x] トップ画面: 日付選択連動（選択日のイベント/なんの日更新 + Today ボタン）— Issue #40 → PR #41
- [x] `next.config.ts` の `remotePatterns` を自プロジェクトの hostname に限定（Issue #46）
- [x] メンバー画像バリデーションを Storage object path + 旧Supabase公開URL互換へ更新（Issue #46）
- [x] EventCalendar の月ラベルと MonthSelector の重複表示を解消（Issue #33）
- [x] 誕生日ドットの色 `#D946EF` を定数に抽出（P2）
- [x] Header ナビに「管理」→ `/admin` ハブに変更、「楽曲」リンク追加（Phase 2 で対応）
- [x] household-web の MonthSelector に `basePath` prop をバックポート（Issue #33）
- [x] household-web の MonthSelector Suspense に fallback 追加（Issue #33）

---

## Phase 2: コンテンツ拡充

### メンバー情報拡張 — Issue #44（完了） / #54（PR #55） / #56（PR #57）

#### 完了済み（Issue #44）

- [x] 星座の保存・表示追加（生年月日から計算）
- [x] 期生入力を数値選択化（グループごとの上限参照）
- [x] コール名の追加
- [x] サイリウムカラー2色の追加（同色可）
- [x] SNS（種別/表示名/URL）の複数登録対応

#### 実装済み（Issue #54 / PR #55 で対応）

- [x] メンバー一覧の初期表示を現役に変更
- [x] グループ履歴に在籍日数を表示（現役は加入日〜当日）
- [x] レギュラー仕事を廃止し、来歴（日時/出来事/備考）セクションを追加
- [x] 来歴の備考中の http(s) URL を自動リンク化
- [x] プロフィールにメモ欄を追加（自由入力）
- [x] メンバー登録/編集フォームへの反映
- [x] メンバー詳細表示への反映
- [x] DB マイグレーション + 型/Repository/UseCase/バリデーション対応

#### 実装済み（Issue #56 / PR #57 で対応）

- [x] メンバー来歴の管理元を `orbit_events` に統合（単一ソース化）
- [x] `orbit_events.is_member_history` を追加し、来歴イベントを識別
- [x] 既存 `orbit_member_histories` データを `orbit_events` + `orbit_event_members` へ移行（重複統合）
- [x] `orbit_member_histories` テーブルを廃止
- [x] イベント作成/編集に「メンバー来歴に表示する」フラグを追加
- [x] 来歴イベント時の関連メンバー必須バリデーションを追加
- [x] メンバー作成/編集フォームから来歴入力欄を削除
- [x] メンバー詳細の来歴表示をイベント由来に切り替え（古い日付順）
- [x] 来歴備考のURL重複表示を回避（説明文内に同一URLがある場合は追記しない）
- [x] 来歴備考のリンク表示を拡張（生URL + Markdownリンク記法 `[text](https://...)`）

### メンバー画像アップロード移行 — Issue #46

#### 完了済み

- [x] Supabase Storage バケット/ポリシー追加（public + authenticated upload）
- [x] メンバー登録/編集フォームをURL入力からファイルアップロードUIへ変更
- [x] `orbit_members.image_url` にStorage object pathを保存
- [x] 画像表示時に object path を public URL へ変換（旧Supabase公開URLのみ後方互換）
- [x] 画像再アップロード時に旧オブジェクトを削除して置換
- [x] 画像バリデーションをStorage path前提へ更新

### 楽曲DB再設計（リリース中心）— Issue #58

要件確定ドキュメント: `docs/ai/orbit-phase2-release-song-requirements.md`

#### 完了済み

- [x] 既存 `orbit_songs` 系テーブルを置換し、リリース中心モデルへ再設計する
- [x] リリースタイプ `single/album/best/compilation/digital_single/other` とタイプ別ナンバリング制約を実装する
- [x] 楽曲とリリースを M:N で管理し、リリースごとの曲順を保持する
- [x] 人物マスタ新設 + クレジット（作詞/作曲/編曲/振付）複数人対応を実装する
- [x] フォーメーション（列数・列ごとの人数・参加メンバー）と整合バリデーションを実装する
- [x] MV（リンク必須条件付き）と衣装（複数 + 画像 + 担当）を実装する
- [x] Admin CRUD と公開一覧/詳細を新モデルへ置換する
- [x] メンバー詳細ページに参加楽曲セクションを追加する
- [x] 公開側リリース一覧/詳細ページを追加する（`/releases`, `/releases/[id]`）

#### 参考（旧実装の履歴）

- [x] 旧楽曲DB実装（Issue #36 / PR #37）
- [x] `orbit_songs`, `orbit_song_groups`, `orbit_song_members` 導入
- [x] 旧フォーメーション表示（フロント/2列目/3列目/アンダー）
- [x] 楽曲管理画面と公開画面（旧モデル）実装

### UI/運用改善（第2弾）

- [x] パフォーマンス改善基盤の導入（Issue #66）
  - [x] `proxy.ts` 側に認証ガードを集約し、`(authenticated)` layout の重複 `getUser()` を廃止
  - [x] Header のユーザー表示を削除し、共通レイアウトの固定コストを削減
  - [x] 閲覧系 read model に shared cache 基盤（optional `SUPABASE_SERVICE_ROLE_KEY`）を追加
  - [x] 更新系 Server Action から `updateTag` でドメイン単位 invalidation を実施
  - [x] 一覧/トップのクエリ軽量化は Issue #68 で継続
- [x] 公開閲覧導線のクエリ軽量化（Issue #68）
  - [x] Top を集約 usecase 化し、誕生日 / OnThisDay の hot path を 1 往復 RPC に置換
  - [x] メンバー一覧を public list DTO + 軽量 query に分離
  - [x] 楽曲一覧を public list DTO + 軽量 query に分離
  - [x] リリース一覧を public list DTO + 軽量 query に分離
  - [x] 閲覧系 cache tag を top / list / detail 粒度へ整理
- [x] 管理導線のマスタデータ分離と初期表示最適化（Issue #67）
  - [x] 編集対象本体と候補マスタの fetch を分離
  - [x] グループ / イベント種別 / メンバー候補 / 制作陣候補 / リリース候補 / 楽曲候補の shared cache 用 read path を追加
  - [x] 管理フォーム向けに軽量 option DTO を追加し、一覧・詳細向け payload の流用をやめる
  - [x] 制作陣更新時に管理フォーム候補と楽曲/リリース詳細の cache を即時失効する
- [x] Top画面2カラム化と右ナビ導入（Issue #60）
  - [x] 左2/3にカレンダー/イベント、右1/3に完全版ナビを配置
  - [x] スマホでは右ナビを非表示（ハンバーガー導線へ一任）
  - [x] Top本文側の `Orbit` 見出しを削除（ヘッダーロゴ導線へ統一）
  - [x] Topの月操作は `Today` 左寄せ、`前月/翌月` 右寄せに調整
  - [x] 上部ナビ/右ナビから `トップ` 項目を除外（`Orbit` ロゴで遷移）
- [x] リリース/楽曲管理UX改善（Issue #61）
  - [x] 双方向紐づけ編集 + タイトル/人物検索導線の追加
  - [x] リリースのアートワークを「担当者 + 画像アップロード」へ移行
  - [x] 楽曲に独立したグループを保持し、フォーメーション割当は同グループ優先表示 + グループ外選択時に注意表示
  - [x] リリース参加メンバーも同グループ優先表示 + グループ外選択時に注意表示（他グループ表示トグル対応）
- [x] 制作陣マスタ管理画面の新規追加（Issue #62）
  - [x] 一覧/CRUD と担当（複数）管理を実装（名前/生年月日/略歴を保持）
  - [x] 導線はトップ右ナビからのみ提供（上部ヘッダー非表示）
  - [x] Header用ナビ（簡易）とTop右ナビ（完全版）の定義を分離する
- [x] 閲覧導線のフィードバック・状態保持（PR #75 / #77 / #78）
  - [x] 一覧カードに押下フィードバックを追加（PR #75）
  - [x] グローバル遷移フィードバックを追加（PR #77）
  - [x] 詳細から一覧へ戻る導線で一覧の絞り込み/スクロール状態を保持（PR #78）

### 一覧のグループ別表示・並び順・検索

- [x] メンバー/楽曲一覧をグループごとにセクション表示（PR #79）
  - [x] `usecases/groupListSections.ts`（`createMemberSections` / `createSongSections`）と `GroupSectionHeading` / `*SectionList` / `*Grid` の共通パターンを導入
  - [x] グループ絞り込み時は従来のフラット表示、未絞り込み時はグループ別セクション表示
- [x] 坂道グループの楽曲/リリース seed データを追加（PR #80、`supabase/seeds/030〜033`）
- [x] リリース一覧をグループ別セクション表示に統一（Issue #81 / PR #84）
  - [x] `createReleaseSections` + `ReleaseGrid` / `ReleaseSectionList` を追加し、楽曲/メンバーと同パターンに揃える
- [x] 楽曲一覧の並び順をグループ内リリース日降順×トラック順にする（Issue #82）
  - [x] 代表リリース日＝初出（最古）。同一リリース内は `track_number` 昇順、未紐付け曲はグループ末尾
  - [x] `SongListItem` に代表リリースID/トラック番号を追加し、`sortSongsForListOrder` で整列
- [x] 楽曲一覧にタイトルのインクリメンタル検索を追加（Issue #83）
  - [x] クライアントサイドで取得済みデータをタイトル部分一致（大文字小文字無視）で動的フィルタ
  - [x] フィルタ関数は `usecases/songSearch.ts` に純粋関数として切り出し、セクション/フラット表示の双方に適用

### 一覧の絞り込みをクライアント側フィルタ＋URL同期に統一（アンブレラ Issue #88）

共通方針: 一覧ページは全件取得し、フィルタはクライアント側 in-memory で実施。URL は `window.history.replaceState`（`lib/listFilterUrl.ts`）で同期し、サーバー往復なしでリロード/共有/#78 を維持する。

- [x] 楽曲一覧のグループ絞り込みをクライアント側フィルタ化（Issue #87）
  - [x] `SongBrowser` にグループ選択を統合、`filterSongsByGroup` 追加、`SongFilters` を撤去
- [x] メンバー一覧の絞り込みをクライアント側フィルタ化（完全クライアント・全件取得）（Issue #89）
  - [x] 卒業含む全件取得に変更し、グループ/ステータスを in-memory フィルタ。初期表示は現役を維持（期生はUI未提供のため本対応の対象外）
  - [x] `MemberBrowser` に統合、`usecases/memberFilters.ts` を追加、`MemberFilters` を撤去
- [x] リリース一覧の絞り込みをクライアント側フィルタ化（Issue #90）
  - [x] 全件取得し、グループ/リリースタイプを in-memory フィルタ。`ReleaseBrowser` に統合、`usecases/releaseFilters.ts` を追加、`ReleaseFilters` を撤去
- [x] 不具合修正: 詳細→一覧へ戻った際に URL の絞り込みが画面へ反映されない（3一覧共通）
  - [x] フィルタ state の初期化元をサーバー prop から `useSearchParams`（URL）へ変更し、URL を真実源化。Router Cache の古い RSC で再マウントされても URL から復元されるようにした
  - [x] 不具合修正: 上記後にプルダウン即時反映が壊れた回帰を、即時=local state / 復元=useSearchParams のハイブリッドで解消（PR #95）
- [x] メンバー一覧に期（世代）絞り込みを追加（Issue #96）
  - [x] グループ選択時のみ表示。選択肢は `Group.maxGeneration`（無ければ実在世代から導出）。グループスコープで絞り込み、グループ変更時はリセット。URL `generation` を同期

### 楽曲ラベル（#141）

- [x] 楽曲に単一ラベル（表題/選抜/アンダー/ソロ/ユニット/期別、任意）を追加し一覧で絞り込み
  - [x] アンダーはグループ別表示（乃木坂=アンダー/櫻坂=BACKS/日向坂=ひなた坂）、期別は「N期生曲」表示＋期サブ絞り込み（候補は group.maxGeneration）
  - [x] duration_seconds を廃止（列削除・入力/表示撤去）。migration 038、RPC は label/generation 対応に再生成
- [x] ラベルに「全員」を追加し、期別曲表記を「N期生」に統一（PR #206）

### 選抜ポジション表示・一元管理（#177 / #178 / #179）

- [x] リリース編集で、選択中ラベルごとの人数を確認できるサマリーを表示する
- [x] アンダー相当の表示名をグループごとに切り替える（乃木坂=アンダー、櫻坂=BACKS、日向坂=ひなた坂）
- [x] 休業中ラベルを追加し、メンバー詳細にも表示する
- [x] 選抜/アンダー/期別、列、センターは楽曲ラベルとフォーメーションから導出し、リリース×メンバーの手動保持は福神/休業中 overlay に限定する（ADR 0007 / PR #180）
- [x] 複数表題曲や期別曲の代表トラック方式を補正する（PR #181）
- [x] 櫻坂46 1st〜5th Single の櫻エイト期を特別ルールとして表示する（PR #182）
- [x] Issue #177 の Decision を ADR 0007 に昇格する（PR #183）
- [x] 櫻エイト期でも期別曲参加メンバーを「N期生」で導出するよう補正（PR #210）
- [x] 休業中は参加登録を保持しつつ、リリース詳細の表示・人数集計から除外する（PR #200 / #204）

### 制作陣管理・担当楽曲表示

- [x] 楽曲フォームの制作陣候補を担当 role で絞り込む（PR #186）
- [x] 未登録の制作陣を楽曲フォーム内モーダルから担当付きで追加できるようにする。名前一致時は既存人物へ担当 role を追加（PR #187）
- [x] 制作陣一覧に名前検索と担当 role 絞り込みを追加（PR #202）
- [x] 制作陣詳細ページに担当楽曲数と担当楽曲一覧を追加（PR #203）
- [x] 担当楽曲一覧の並びをリリース日昇順、曲順昇順に統一（PR #205）

### 楽曲/リリース表示の改善

- [x] リリース収録曲に楽曲ラベルを表示する（PR #191）
- [x] 楽曲詳細のフォーメーションを楽曲情報の直下へ移動する（PR #199）
- [x] メンバー詳細の参加楽曲をリリース日昇順・曲順昇順に並べ、リリース種別/楽曲ラベルバッジを表示する（PR #211）

### リリース種別にベスト/コンピレーションを追加（#129）

- [x] `release_type` に `best` / `compilation` を追加（ナンバリング無し）。一覧フィルタ「アルバム」でアルバム系（album/best/compilation）をまとめて表示、ラベルは `BEST Album` / `Compilation Album`（migration 037）

### 楽曲動画・カレンダーイベント

- [x] 楽曲に関連動画（Dance Practice/ひなリハ、コール動画）を追加する。MV と同じく URL と配信日を持ち、監督は持たない（PR #192）
- [x] リリース収録曲に MV / Dance Practice・ひなリハ / コール動画の有無をバッジ表示する（PR #193）
- [x] トップのカレンダー/当日イベント/今日はなんの日に、ライブ公演日とリリース日を表示（読み取り側で集約、データ二重化なし）
  - [x] `liveRepository.findCalendarPerformances` / `releaseRepository.findCalendarItems` を追加し `getTopPageContent` で月/当日/OnThisDay にマージ
  - [x] 種別ごとに色ドット（ライブ/リリース）＋一覧・OnThisDay にバッジとリンク表示。top キャッシュを lives/releases タグに連動
- [x] MV/関連動画の配信日を動画配信イベントとしてトップの月カレンダー/選択日/今日はなんの日に表示する（PR #212）
  - [x] `songRepository.findCalendarVideoItems` を追加し、`orbit_track_mvs.published_on` / `orbit_track_videos.published_on` を `getTopPageContent` で合成
  - [x] 表示は「曲名（種別）」、バッジは「動画」。リンクは動画URLへ外部リンクとして開く。top キャッシュを songs タグにも連動

### リリース/ライブ一覧の表示見直し

- [x] リリース一覧: グループ別セクションを廃止し、リリース日降順のフラット表示＋グループ色バッジに変更（グループ＋リリースタイプ絞り込みは維持、日付未定は末尾）
- [x] ライブ一覧: 出演グループ絞り込みを追加し、最初の公演日の降順表示＋出演グループ色バッジに変更（`LiveListItem` に色付き出演グループを追加、日付未定は末尾）

### ライブ情報 + セットリスト（アンブレラ Issue #98）

要件・データモデル: Issue #98。段階実装（会場 → ライブ/公演 → セットリスト → セトリ拡張、参加記録は将来）。

- [x] A: 会場マスタ `orbit_venues`（Issue #99）
  - [x] CRUD（`/venues`, `/venues/new`, `/venues/[id]/edit`）＋公開詳細（`/venues/[id]`）。名称/都道府県/住所/キャパ/交通情報/メモ
  - [x] Top 右ナビに「会場」を追加
  - [x] 入力改善（Issue #115）: 住所を廃止し Googleマップ/公式サイトのリンク追加。都道府県を選択式（47＋海外は地域手入力）に
- [x] B: ライブ＋公演 基盤（`orbit_lives` / `orbit_live_performances` / performers）（Issue #100）
  - [x] ライブ（名称/種別/説明）＋出演グループ＋出演メンバー基準ロスター
  - [x] 公演（会場/日付/開場・開演/昼夜/配信/LV/チケット・座席）を複数管理
  - [x] 公演ごとの休演メンバー記録（任意メモ）＝グループ基準＋例外で休演
  - [x] Admin CRUD（`/admin/lives`）／公開一覧・詳細（`/lives`, `/lives/[id]`）
  - [x] 会場詳細にその会場の公演を逆引き表示
  - [x] ネスト更新を RPC `upsert_orbit_live` でトランザクション化（migration 031）
- [x] C: セットリスト基盤（楽曲/MC/影アナ/VTR）（Issue #101）
  - [x] `orbit_setlist_items`（公演ごと・順序つき・種別）を追加し、RPC `upsert_orbit_live` を拡張
  - [x] 楽曲は登録曲（`orbit_tracks`）参照 or 未登録曲テキスト。MC/影アナ/VTR/その他に対応
  - [x] LiveForm にセットリスト編集（行追加・並べ替え・削除）、公開公演詳細に表示
- [x] D: セトリ楽曲の拡張（センター/披露メンバー/披露タイプ）（Issue #102）
  - [x] `orbit_setlist_item_members`（is_center）＋ `orbit_setlist_items.performance_style` を追加、RPC 拡張
  - [x] 披露タイプ（フル/ワンハーフ/間奏ロング/その他）＝ enum＋その他
  - [x] LiveForm に披露タイプ・披露メンバー（センター）編集、LiveDetail に表示
- [ ] E（実装中）: 参加記録＋現地カウント/ランキング（アンブレラ #103。分割: 基盤 #246 / マイページ #247 / ビジュアライズ #248 / セトリカウント #249 / 会場集計 #250 / 座席記録(Backlog) #251）

#### 入力UX改善（A/B/C）

- [x] A: 昼夜削除・種別統合（単発/ツアー/フェス/配信/その他）・休演候補のロスター限定（Issue #109）
  - [x] `live_type` を単一軸の種別に統合（旧 `live`→`single`、`tour` 追加）。`format` は導入しない
  - [x] `session_label` 削除、RPC 更新。単発のみ1会場バリデーション（配信は複数日程・会場任意を許容）
- [x] C: 事前情報/当日カード横スライドのレイアウト再設計（Issue #111）
  - [x] 公開詳細を上部「会場・日程」（単発=ブロック/ツアー=会場カードのグリッド、見出し=都道府県+公演）＋下部「公演ごとの情報」（1日カードの横スライド scroll-snap）に再構成
  - [x] 種別ごとの時間表示（フェス=出演時刻 / 配信=配信時刻、開場は非表示）。フォームも同様に出し分け
  - [x] 管理フォームも「日程・会場（事前）」と「公演ごとの当日情報（横スライド）」に入力エリアを分離
  - [x] `LivePerformance.venuePrefecture` を追加（ツアーのカード見出し用）
- [x] B: 出演メンバー自動計算・会場/楽曲コンボボックス（Issue #110）
  - [x] 出演グループ＋最初の公演日から在籍メンバーを算出して自動入力（サーバーアクション、既存選択にマージ）
  - [x] 依存なし自作 `Combobox`（手入力で候補→選択、キーボード操作・外側クリック対応）を会場・楽曲入力に適用

---

## Phase 3: 発展機能

- 聖地巡礼マップ（Issue #286 / ADR 0010）
  - [x] Phase 1: 登録（Places Autocomplete）・地図表示・種別/サブ種別フィルタ（✅ #286 / PR #288・#290・#291 で対応済み）
    - スポット単一カテゴリは廃止し、出来事（グループ・種別・サブ種別・出典FK・メンバー）を1件以上必須とするモデルに変更（ADR 0010 追記、migration 055〜057）
  - [x] Phase 2: スポット詳細ページ + 一覧/地図の導線（✅ #292 / PR #296）、写真アップロード（✅ #293 / PR #297）、フィルタ拡充（✅ #294 / PR #299。種別・都道府県は select、サブ種別・メンバー名・スポット名は横断テキスト検索）
  - [ ] Phase 3: 訪問記録（ユーザー別データ、ADR 0009 パターン）。近隣検索は件数が増えたら PostGIS を検討
  - リファクタ: create/update のトランザクションRPC化（#289、既知負債表参照）
- メディア出演管理（`orbit_media`）
- 公開アクセス対応（RLS の SELECT ポリシーを `true` に変更）
- 遠征持ち物リスト
- スケジュール分析（イベントデータからの集計・可視化）
- 外部サイトリンク集

---

## 技術的負債・既知の制限

| 項目 | 詳細 | 対応方針 |
|---|---|---|
| ~~`<img>` 使用~~ | ~~lint warning あり~~ | ✅ Phase 1.5 で `next/image` に移行済み |
| ~~全件取得フィルタ~~ | ~~誕生日/OnThisDay で全件取得~~ | ✅ Phase 1.5 で RPC 関数化済み |
| ~~カレンダー月切り替え~~ | ~~データは初期ロード時の月のみ~~ | ✅ Phase 1.5 で URL search params 対応済み |
| ~~middleware 非推奨警告~~ | ~~Next.js 16 で `middleware.ts` が deprecated~~ | ✅ Issue #27 対応で `proxy.ts` へ移行済み |
| Orbit 閲覧導線の request 依存 | layout 認証と cookie 依存 read path が重なり shared cache を使いにくい | ✅ Issue #66 で基盤対応、クエリ最適化は Issue #68 で継続 |
| ~~Repository update 非アトミック~~ | ~~update の全削除→再挿入がトランザクションなし~~ | ✅ member(012) / event update(015) / release・song(022/023/026) / live(031) / setlist(052) / spot(059) で RPC 化済み。event create のみ補償削除方式が残る（下記） |
| event create 非アトミック | event + groups + members を複数リクエストで挿入（失敗時は補償削除で被害は限定済み） | Issue #304 で RPC 化予定（`upsert_orbit_spot`（059）と同型） |
| spot create/update 非アトミック | spots + appearances + members + photos を複数リクエストで書き込む（新規挿入→旧削除の順序化と補償削除で被害は限定済み） | Issue #289 で対応済み |
| ~~画像アップロード基盤の3重複~~ | ~~member / release / spot で storage repository・lib ヘルパー・readFileAsBase64 がほぼ逐語コピー~~ | ✅ Issue #298 で対応済み |
| `UpdateXxxInput = CreateXxxInput` | 部分更新不可（全フィールド送信が必要） | フォームは常に全フィールド送信するため当面問題なし |
| ~~Top右ナビとHeaderの項目定義が共有~~ | ~~#60時点では `APP_NAV_ITEMS` を共通利用しており、簡易/完全版の役割分離が未完了~~ | ✅ Issue #62 で `HEADER_NAV_ITEMS` / `TOP_NAV_ITEMS` に分離済み |
| ~~Orbit 認可が authenticated 一段階~~ | ~~Supabase サインアップ OFF は確認済みだが、RLS レイヤーでオーナー限定の多層防御がない~~ | ✅ Issue #213 で対応済み |
| ~~auth callback / public route 判定の軽微な緩さ~~ | ~~`next` のバックスラッシュ、public path の前方一致判定~~ | ✅ Issue #214 で対応済み |
| ~~`createReadOnlyClient` が型レベルでは read-only でない~~ | ~~service role client のため、誤用時に書き込み API も呼べる~~ | ✅ Issue #215 で `ReadOnlySupabaseClient` に型限定済み |
| ~~Supabase 生成型未導入~~ | ~~リレーション型を手書きし、`T \| T[]` union / `as` キャストが残る~~ | ✅ Issue #216 / #239〜#241 で全リポジトリ typed client 化済み（残る `as` は CHECK 制約列の enum 絞り込みのみ） |
| ~~song/release リポジトリ肥大化~~ | ~~select 定義と mapper が CRUD 本体に同居している~~ | ✅ Issue #217 で mapper 分割済み |
| ~~管理フォーム巨大化~~ | ~~`SongForm` / `ReleaseForm` / `LiveForm` / `MemberForm` に submit・errors・keyed array 操作が重複~~ | ✅ Issue #218 で `useAdminForm` + keyedList 共通化・セクション分割済み |
| ~~ルート error / not-found 未整備~~ | ~~`notFound()` は複数箇所で使うが、カスタム 404 とルートエラー画面がない~~ | ✅ Issue #219 で対応済み |
| ~~admin/viewer ロール体系が未導入~~ | ~~現状はオーナー単独運用前提。閲覧のみ共有ができない~~ | ✅ Issue #221 / #244 で導入済み（RLS 045/046 + proxy allowedRoles + requireAdmin/requireOrbitUser） |
| ~~Google Maps API キーの制限設定が未確認~~ | ~~`NEXT_PUBLIC_*` で公開されるキー。ADR 0010 はリファラ制限 + 予算アラート設定を採用条件にしている~~ | ✅ 2026-07-07 に設定済みを確認（ADR 0010 追記） |
| SpotForm の肥大化 | 728 行。共通基盤は適用済みだがセクション分割が `SpotPhotosSection` のみ | Issue #303 で SongForm と同構成（`components/admin/spot/` へのセクション分割）に揃える |
| ~~revalidateOrbit のタグ依存が手書き~~ | ~~エンティティ間の表示参照に伴う失効タグをコメント付きで手動管理~~ | ✅ Issue #305 で「タグ→表示エンティティ」の宣言表（`TAG_DISPLAY_SOURCES`）に再構成済み |
| `readOrbitData.ts` の単調成長 | ページローダー集約点として 402 行・12 ローダーに成長 | Issue #306 でドメイン別（music / live / spot / venue）分割を検討 |
