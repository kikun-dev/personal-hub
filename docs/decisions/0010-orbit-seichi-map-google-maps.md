# ADR 0010: 聖地巡礼マップの実装場所と地図ライブラリの採用

## Status

Accepted

## Context（背景）

グループの活動（MV撮影、番組ロケ、ヒット祈願など）で訪れた場所を記録し、
実際に訪れる際の参考にする「聖地巡礼マップ」機能を追加する（Issue #286）。

この機能では 2 つの判断が必要だった。

### 1. どこに実装するか

- 案A: Orbit（oshikatsu-web）の一機能
- 案B: 別アプリ（seichi-web）としてモノレポに追加し、DB のみ共有
- 案C: 既存サービス（seichimap / JapanAnimeMaps 等）や Google マイマップで代替

聖地スポットの本質データは「誰が（メンバー）・何で（MV / 関連動画 / イベント / ライブ）訪れたか」であり、
`orbit_members` / `orbit_tracks` / `orbit_track_videos` / `orbit_events` / `orbit_lives` への参照そのものである。

- 案B は `packages/supabase` の共有だけでは足りず、orbit ドメインの usecase / repository を
  アプリ間で共有するための共通パッケージ化が必要になる（`rules/architecture.md` の
  「apps 間参照禁止」と衝突しやすい大工事）
- 案C の既存サービスはアニメ作品軸であり、アイドルグループ×メンバー×動画シリーズという
  独自軸での管理・検索ができない。Google マイマップは多軸検索と既存データ連携が不可能

### 2. 地図ライブラリをどうするか

- 案A: Google Maps JS API + `@vis.gl/react-google-maps`
- 案B: MapLibre GL JS + 無料タイル（OpenFreeMap 等）
- 案C: Leaflet + OSM ラスタタイル

Google Maps Platform は 2025年3月に旧 $200 クレジットから SKU 別無料枠に変わり、
動的マップ月 1 万ロード / Geocoding 月 1 万件 / Places Autocomplete セッションはほぼ無料。
個人利用（月数百ロード想定）なら確実に無料枠に収まる。ただし課金アカウント登録（クレカ）が必須。

案B / 案C は完全無料だが、日本の店舗名レベルのジオコーディング（場所名検索→座標）に
使える無料サービスがなく、スポット登録のたびに Google マップから座標を手動コピーする運用になる。

## Decision（決定）

### 1. 聖地巡礼マップは Orbit の一機能として実装する（案A）

- スポット関連テーブルは `orbit_` プレフィクスで追加し、既存テーブルへ FK で参照する
- RLS / proxy ガードは既存の orbit 方針（ADR 0008: SELECT = admin/viewer、書き込み = admin）をそのまま適用する
- データモデルは spots（スポット）/ appearances（出来事）/ appearance_members（誰が）/ photos（写真）の 4 テーブル構成とする

### 2. 地図は Google Maps JS API + `@vis.gl/react-google-maps` を採用する（案A）

- 登録 UX を Places Autocomplete（場所名検索→座標・place_id 自動入力）に寄せる
- 無料枠運用を前提に、Google Cloud 側で予算アラートと API キーの HTTP リファラ制限を必ず設定する
- 動的マップ表示は閲覧ページに限定し、無料枠（月 1 万ロード）を大きく下回る利用に留める

### 3. 近隣検索は Phase 1 では作らない

- スポットは緯度経度の numeric 列で保持し、地図パン + 全件ピン表示で「近くの聖地」を探せれば十分とする
- 件数増加で必要になった場合に PostGIS（`geography(Point)` + GIST インデックス + `ST_DWithin` RPC）へ
  移行する（早すぎる最適化をしない。`docs/ai/PROJECT.md` 設計方針）

## Consequences（結果・影響）

### 良い点

- 既存の Orbit エンティティと通常の FK + JOIN で紐づき、メンバー詳細→ゆかりの地のような
  クロスリンクを将来自然に追加できる
- 認可（RLS / proxy）・キャッシュ（ADR 0006）・管理画面の既存パターンを再利用でき、実装が小さく済む
- Places Autocomplete により、スポット登録が「店名で検索して選ぶ」だけで完結する

### 悪い点

- Google Maps Platform の課金アカウント登録が必要になり、無料枠の変更リスクを外部に持つ
  （予算アラート + キー制限で防御。将来の値上げ時は MapLibre + 手動座標入力へ退避可能）
- 地図コンポーネントが Google 依存になり、ライブラリ乗り換え時は地図 UI の書き直しが必要
  （地図表示は UI 層に閉じ、UseCase / Repository は座標データのみ扱う構成で影響を限定する）
- Orbit アプリのスコープが「グループ活動データ」から「場所」まで広がり、管理画面のメニューが増える

## Notes

- 発端 Issue: #286（Options / Trade-offs の詳細はそちらの Design notes を参照）
- 関連 ADR: 0006（read cache）、0008（認可）、0009（ユーザー別データ。Phase 3 の訪問記録で適用予定）
