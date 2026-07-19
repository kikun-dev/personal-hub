# scripts/perf（#383: Top Page bounded read 実DB execution plan 検証）

Top Page（`usecases/getTopPageContent.ts` / `usecases/getRecentAttendance.ts`）が
実行する bounded read の execution plan を、ローカル Supabase + 実
PostgREST 経由で検証するための driver 一式。**通常の CI / build には
一切含まれない**（`vitest.perf.config.ts` は既定の `vitest run`
= `pnpm test:unit` の include 対象外）。

## 全体の手順

```bash
cd apps/oshikatsu-web

# 1. DB を初期状態にリセット（既存 seed のみが入る）
npx supabase db reset

# 2. ローカル専用のロール権限補完（fixture とは独立の既知の環境ギャップ。
#    無いと service_role キーでも REST 経由の読み取りが全て
#    permission denied になる。詳細は grant-local-roles.sql のコメント参照）
docker exec -i supabase_db_oshikatsu-web psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < scripts/perf/grant-local-roles.sql

# 3. フィクスチャ適用（small / medium / large から選択）
docker exec -i supabase_db_oshikatsu-web psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < supabase/perf-fixtures/fixture_small.sql

# 4. auto_explain を authenticator ロールへ設定
#    ※ `-U postgres` ではなく `-U supabase_admin` で実行すること
#    （postgres ロールは rolsuper=false。session_preload_libraries は
#    GUC context='superuser' のため superuser 権限が必要。実機確認済み）
docker exec -i supabase_db_oshikatsu-web psql -U supabase_admin -d postgres \
  -v ON_ERROR_STOP=1 < scripts/perf/setup-auto-explain.sql

# 5. PostgREST の接続プールを作り直す（ALTER ROLE ... SET は新規接続からのみ有効）
docker ps --format '{{.Names}}' | grep rest   # コンテナ名を確認
docker restart supabase_rest_oshikatsu-web

# 6. driver を実行（3シナリオ + attendance heavy/light）
pnpm perf:driver

# 7. 実行計画を回収する
docker logs supabase_db_oshikatsu-web --since 5m > /tmp/perf-plans.log
# シナリオの境目は driver の stdout（=== SCENARIO: ... ===）と、
# ログ内の `__perf_scenario_marker__<label>__` を突き合わせて特定する。
grep -n "__perf_scenario_marker__" /tmp/perf-plans.log
```

サイズを変える・再計測する場合は 1 からやり直す（db reset は全データ・
全ロール設定を消すため、2〜5 も毎回やり直しが必要）。

## driver（`topPageDriver.perf.ts`）の内容

- `@supabase/supabase-js` の `createClient<Database>(url, key)` で
  ローカル API（既定 `http://127.0.0.1:54321`）へ接続する
  （`Database` 型は `@personal-hub/supabase` から type-only import。
  ESLint の `no-restricted-imports` ルールにより runtime import は
  サブパス限定のため、このパッケージ自体からの実体 import はしない）。
- 接続情報・固定ユーザーの UUID/email/password は
  `../../supabase/perf-fixtures/README.md` と共有する定数（コード内に
  ローカル専用であることを明記した上でハードコード。環境変数
  `PERF_SUPABASE_URL` / `PERF_SUPABASE_ANON_KEY` /
  `PERF_SUPABASE_SERVICE_ROLE_KEY` は **別ポート等のローカル設定専用**）。
  driver は service-role で fixture ユーザー作成まで行うため、接続先 URL を
  実行前に検証し **http://127.0.0.1 / http://localhost 以外は即時エラー**にする
  （fail closed。https・Hosted Supabase・remote hostname は不可。port は固定しない。
  回避フラグは用意しない — Constraint「production data へ write しない」の保証）。
- `beforeAll` で service_role client を作り、3固定ユーザーが
  存在することを保証する（`ensureFixedUser`。通常は fixture が
  既に作成済みのため `getUserById` がヒットして no-op）。続けて
  heavy/light の2ユーザーで `signInWithPassword` する。
- heavy user の client で `getTopPageContent(...)` を3シナリオ実行:
  - `today`: `(2026,7,19,2026,7,19)`
  - `same-month-selected`: `(2026,7,5,2026,7,19)`
  - `window-external-selected`: `(2024,3,10,2026,7,19)`
    （selected月とnext-events窓が重ならず、`buildCalendarRanges` が
    2つの disjoint range を `.or()` で問い合わせる経路を検証する）
- heavy / light 両ユーザーの client で `getRecentAttendance(...)` を実行
  （light はデータ量が少ない側の selectivity 比較用）。
- 各シナリオの前後で `console.log` のマーカー（`=== SCENARIO: ... ===`）と、
  service_role client によるマーカー query（存在しない値で
  `orbit_event_types` を select し、そのフィルタ値がラベル文字列として
  auto_explain の "Query Parameters" に残る）の両方を出す。
  PostgREST は任意の生SQL実行エンドポイントを持たないため、
  `select 1 as "SCENARIO_..."` 相当を素朴に投げる手段が無く、この形に
  した（`docker logs` 上で `__perf_scenario_marker__<label>__` を
  grep すればシナリオの境目と実行計画を対応付けられる）。
- 各シナリオ・attendance 実行後に結果件数（`monthEvents` 等の配列長、
  `entries.length`）を `console.log` し、bounded であること
  （`nextEvents.length <= 4`、attendance `entries.length <= 3`）を
  `expect` でも確認する。

### 実行方式について

新規 npm 依存追加を避けるため、`tsx` 等の実行ツールは導入せず、既存の
`vitest` に driver を `describe`/`it` として実装し、専用設定
`vitest.perf.config.ts`（include: `scripts/perf/**/*.perf.ts`、
`reporters: ["verbose"]` で console.log を既定表示）経由で実行する。
`package.json` の `perf:driver` スクリプトから
`vitest run --config vitest.perf.config.ts` を呼ぶ。

`@supabase/supabase-js` は `apps/oshikatsu-web` の devDependency として
追加した（pnpm の strict node_modules では `@personal-hub/supabase` 経由の
transitive dependency を直接 import できないため。バージョンは
`packages/supabase` と同じ `^2.110.0` に揃えている）。

## 動作確認済みの内容（fixture_small で実施）

- 3シナリオ + attendance(heavy/light) の計5テストが全てエラーなく完走
  （`pnpm perf:driver`、`Tests 5 passed (5)`）。
- 結果件数（例）: `today`: monthEvents=32 selectedDateEvents=8
  onThisDayEvents=6 todayEvents=8 nextEvents=4 / attendance heavy:
  entries=3（母数10件中）/ attendance light: entries=3（母数3件）。
  `nextEvents` は常に4件以下、attendance の `entries` は常に3件以下
  （bounded read の確認）。
- `docker logs supabase_db_oshikatsu-web` に auto_explain の plan が
  Query Text 付きで出力されることを確認済み。特に:
  - `orbit_live_attendances` の `!inner` embed クエリ
    （`RECENT_ATTENDANCE_SELECT` 相当）の plan（Limit → Sort →
    InitPlan(has_orbit_read_role) → InitPlan(auth.uid) → ... という
    構造）が Buffers 付きで確認できた。
  - RPC（`find_orbit_calendar_videos_in_ranges` /
    `find_orbit_events_on_this_day` 等）呼び出し時、
    `log_nested_statements=on` により RLS 判定関数
    （`has_orbit_read_role` の SQL function 内部）の plan も
    `CONTEXT: SQL function "has_orbit_read_role" statement 1` 付きで
    別途ログに出ることを確認済み。

## 既知の環境ギャップ（grant-local-roles.sql）

`grant-local-roles.sql` の冒頭コメントを参照。要約すると、hosted
Supabase はプロジェクト作成時に `anon` / `authenticated` / `service_role`
への基盤 GRANT を自動的に用意するが、ローカルの `npx supabase db reset`
は migrations のみを再生するためこれが無い。この gap はこの perf 計測
タスクを進める過程で判明したもので、#383 の fixture/driver 自体の問題
ではないが、driver を実 PostgREST 経由で動かすには埋める必要がある
ため本ディレクトリに含めた。migrations には追加していない（本番の
hosted プロジェクトは既にこの GRANT を持っているため不要であり、
無くても良い変更をわざわざ本番へ持ち込まないため）。
