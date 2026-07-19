# perf-fixtures（#383: Bounded Top Page read 実DB execution plan 検証用）

Top Page（`usecases/getTopPageContent.ts` / `usecases/getRecentAttendance.ts`）が
実行する bounded read の execution plan をローカル Supabase 上で検証するための
フィクスチャ。**通常の CI / `npx supabase db reset` の自動 seed には含まれない**
（`supabase/config.toml` の `db.seed.sql_paths = ["./seeds/*.sql"]` は
`./seeds/` のみを見るため、本ディレクトリはその対象外）。

計測手順の全体像は `../../scripts/perf/README.md` を参照。本ファイルは
フィクスチャ自体の内容（確定件数・日付分布・固定値）だけを扱う。

## 適用方法

```bash
cd apps/oshikatsu-web
npx supabase db reset
docker exec -i supabase_db_oshikatsu-web psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < scripts/perf/grant-local-roles.sql   # 後述の注意点を参照
docker exec -i supabase_db_oshikatsu-web psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < supabase/perf-fixtures/fixture_small.sql  # small/medium/large を選択
```

サイズを切り替えたいときは、必ず `npx supabase db reset` からやり直すこと
（各ファイルは追加専用で、既存 seed への重複適用や UNIQUE 制約違反を
想定していない）。

## 前提として一緒に当てる必要があるもの（fixtureとは別の既知の環境ギャップ）

ローカル `npx supabase db reset` は migrations のみを再生するため、
hosted Supabase プロジェクトがプロジェクト作成時に自動で用意する
`GRANT ... ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role`
相当の基盤 GRANT が無い。この状態では **service_role キーであっても**
`permission denied for table orbit_events` のように REST 経由の読み取りが
全て失敗する（RLS 以前の GRANT 段階で拒否される。`has_table_privilege()` で
実機確認済み）。driver を実 PostgREST 経由で動かすには、fixture 適用と
同じタイミングで `scripts/perf/grant-local-roles.sql` を一度適用しておく必要がある
（詳細はそのファイルのコメント、および `scripts/perf/README.md` を参照）。

## 固定 UUID / 固定ユーザー

driver（`scripts/perf/topPageDriver.perf.ts`）と共有する定数。3ファイルとも同一。

| 用途  | UUID                                   | email                       |
| ----- | --------------------------------------- | ---------------------------- |
| heavy | `11111111-1111-4111-8111-111111111111` | `perf-heavy@example.test`    |
| light | `22222222-2222-4222-8222-222222222222` | `perf-light@example.test`    |
| zero  | `33333333-3333-4333-8333-333333333333` | `perf-zero@example.test`     |

パスワード（3ユーザー共通）: `perf-fixture-P@ssw0rd`

これらは **fixture ファイル自身が `auth.users` / `auth.identities` へ直接
INSERT する**（`orbit_live_attendances.user_id` が `auth.users` への
`NOT DEFERRABLE` な FK のため。詳細は「判断・妥協した点」を参照）。
driver 側は idempotent な admin API 呼び出し（無ければ作成）を持つが、
通常は fixture が先に作成済みのため no-op になる。

## 確定件数表

`orbit_events` 等は fixture 追加分。`orbit_lives` / `orbit_live_performances` /
`orbit_releases` は「既存 seed 分 + fixture 追加分 = 合計」を示す
（既存 seed: lives 51 / performances 234 / releases 93。`orbit_members` /
`orbit_track_mvs` / `orbit_track_videos` / `orbit_events` / `auth.users` /
`orbit_live_attendances` は既存 seed が 0 件のため fixture 追加分がそのまま合計）。

| ドメイン                                    | small       | medium      | large        |
| -------------------------------------------- | ----------- | ----------- | ------------ |
| orbit_members                                 | 30          | 100         | 90（卒業18） |
| orbit_events                                  | 60          | 220         | 700          |
| orbit_lives（既存51 + 追加）                  | 81          | 171         | 1317         |
| orbit_live_performances（既存234 + 追加）     | 264         | 354         | 1500         |
| orbit_releases（既存93 + 追加）               | 103         | 133         | 250          |
| orbit_track_mvs                               | 15          | 60          | 150          |
| orbit_track_videos                            | 30          | 120         | 400          |
| attendance: heavy user                        | 10          | 100         | 1000         |
| attendance: light user                        | 3           | 3           | 3            |
| attendance: zero user                         | 0           | 0           | 0            |
| on-this-day 年数（7/19を必ず配置する過去年数） | 1（2025）   | 4（2022-2025） | 13（2013-2025） |

上記は実際に `db reset` → 各ファイル適用で得られた `RAISE NOTICE` の
サマリと一致する（適用時に標準出力へ表示される。件数がズレていたら
`fixture_X.sql` 冒頭の `DECLARE` ブロックの定数を確認すること。定数が
唯一の真実sourceであり、この表はそこから書き起こしたもの）。

## 日付分布の設計（events / performances / releases / videos 共通）

仮想の today = **2026-07-19** を基準に、4ドメイン（events, lives+performances,
releases, track_mvs+track_videos）はそれぞれ同じバケット構成で日付を割り当てる。

- **K（on-this-day）**: 過去各年の `07-19` に1件ずつ配置。年数はスケールごとに
  上表の通り（small=1年、medium=4年、large=13年）。`find_orbit_*_on_this_day`
  RPC 群が「月日一致・複数年ヒット」を実際に返すことを検証する。
- **M（当月特異日、3件固定）**: `2026-07-19`（today / シナリオA選択日）、
  `2026-07-05`（シナリオB選択日）、`2026-07-28`（today より後、next-events
  候補）。
- **F（next-events窓の未来特異日、4件固定）**: `2026-09-10` / `2026-12-24` /
  `2027-03-01` / `2027-06-30`（today+12ヶ月の窓内）。
- **S（選択月が12ヶ月窓の外になるシナリオ用、2件固定）**: `2024-03-10`
  （シナリオC選択日と完全一致）/ `2024-03-22`。
- **R（bulk）**: 残り件数を `2014-01-01`〜`2026-06-30` の範囲へ
  `setseed(0.4242)` 済みの `random()` で一様分散し、archive 全体としての
  realistic selectivity を作る。

members の `date_of_birth` は上記と別ロジックで、全12ヶ月に round-robin で
分散させ、先頭3人を強制的に `07-19` 生まれにしている（`findAllBirthdays` /
月別の誕生日イベント計算を各月・複数の同日ヒットの両方で検証できるように
するため）。large のみ 5人に1人（約20%）を卒業済み（`graduated_at` 非null）
にする。

## FK 整合・embed 非null化

- events は `orbit_event_types`（既存10種を rotate）と紐づけ、
  `orbit_event_groups` を1件ずつ張る（`orbit_groups` を rotate）。
- lives/performances は `orbit_live_performer_groups` を1件ずつ張り
  （`orbit_groups` を rotate）、`performance.venue_id` は既存 `orbit_venues`
  （46件）を rotate して必ず non-null にする。これにより
  `RECENT_ATTENDANCE_SELECT` の embed（`orbit_lives.orbit_live_performer_groups`
  / `orbit_venues`）が常に非nullで解決される。
- releases / track_mvs / track_videos は既存の `orbit_groups` /
  `orbit_tracks`（551件、既存 seed のまま。fixture では新規作成しない）を
  再利用する。`orbit_track_mvs.track_id` は UNIQUE、
  `orbit_track_videos.(track_id, video_type)` も UNIQUE のため、
  track を2件ずつ使って `dance_practice` / `call` を1件ずつ割り当てる形にし、
  既存トラック数（551）を超えないことを起動時に `RAISE EXCEPTION` で検査する。

## 判断・妥協した点

- **fixture が `auth.users` / `auth.identities` に直接 INSERT する**:
  `orbit_live_attendances.user_id` は `auth.users` への `NOT DEFERRABLE` な
  FK。「`db reset` → 本ファイル適用」のワンショットで attendance 行を
  作るには、適用時点で参照先の `auth.users` 行が存在している必要があり、
  fixture 自身がこれを作る以外に選択肢が無い（driver の admin API 呼び出しを
  fixture 適用より先に走らせる二段階運用は、依頼元の「db reset → fixture
  適用」というシンプルな一撃適用フローと相性が悪いため避けた）。
  パスワードは pgcrypto の `crypt(..., gen_salt('bf'))`（標準bcrypt形式）で
  ハッシュ化しており、GoTrue の `signInWithPassword` で実際にログインできる
  ことを実機確認済み。
- **ローカル専用の GRANT 補完（`scripts/perf/grant-local-roles.sql`）が別途必要**:
  本タスクを進める中で判明した、fixture とは独立の既知の環境ギャップ。
  「前提として一緒に当てる必要があるもの」の節を参照。
- **releases の `release_type` は全て `digital_single`（`numbering` は
  NULL）に固定**: `orbit_releases_numbering_rule` CHECK 制約
  （single/album は numbering 必須、それ以外は NULL 必須）を満たしつつ、
  グループ・ナンバリングの採番管理を fixture 側で持たなくて済むための単純化。
  Top Page の read パス（`findCalendarItemsInRanges` 等）は `release_type`
  / `numbering` を条件に使わないため、検証の妨げにはならない。
