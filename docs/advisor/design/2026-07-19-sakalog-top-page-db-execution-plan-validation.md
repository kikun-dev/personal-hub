# Sakalog Top Page DB Execution Plan Validation

- 実施日: 2026-07-19 JST
- 対象: Issue #383（[2026-07-19 Read Performance Audit](./2026-07-19-sakalog-daily-story-top-page-read-performance-audit.md) P2-003）
- 実行条件: ローカル Supabase スタック（ADR 0012、production 同一 migration）、実 PostgREST 経由、
  authenticated user（`app_metadata.role = viewer`）、RLS 有効、`SECURITY INVOKER` 維持、
  `auto_explain (ANALYZE, BUFFERS, nested)` による plan 回収
- 再現手順: `apps/oshikatsu-web/scripts/perf/README.md`（fixture: `apps/oshikatsu-web/supabase/perf-fixtures/`）
- 判定: **問題なし。validation-only で完了**（Decision rule 準拠。index / RPC / query 変更の提案なし、watch 2件）

この文書は point-in-time report である。production data へは一切 write していない。

## 1. Executive Summary

Top Page の全対象 read（global 9 query + Recent Attendance）を small / medium / large fixture で
`EXPLAIN (ANALYZE, BUFFERS)` 相当（auto_explain）により計測した。結果:

- **disk sort / temp file はゼロ**。全 sort は in-memory ≤ 31kB（top-N heapsort / quicksort）
- **range 系 query（events / performances / releases / videos）は archive 増に対して index で適応**し、
  large では rows_removed ≈ 0、buffers は fixture サイズに依存せずほぼ一定
- **不要な full scan なし**。small で見られる Seq Scan は小テーブルに対する planner の正当な選択で、
  medium 以降は date index（`idx_orbit_events_date_range` / `idx_orbit_live_performances_date` /
  `idx_orbit_releases_release_date` / `idx_orbit_track_{mvs,videos}_published_on`）へ切り替わる
- **RLS / verified user 境界を含む実運用相当の plan** で計測した（`has_orbit_read_role()` の
  InitPlan / nested statement を plan 上で確認）
- watch 2件（§5）: Recent Attendance の本人参加記録数への線形性、on-this-day 系の archive 線形 filter。
  いずれも現時点の evidence では変更提案の閾値に達しない

## 2. Fixture / Scenario

fixture は決定論的（`setseed` 固定）、仮想 today = 2026-07-19。適用は毎回
`supabase db reset` からのクリーン状態。件数の確定値:

| Domain | small | medium | large |
|---|---:|---:|---:|
| orbit_members（全員 date_of_birth 分布あり） | 30 | 100 | 90（卒業18含む） |
| orbit_events | 60 | 220 | 700 |
| orbit_lives | 81 | 171 | 1,317 |
| orbit_live_performances | 264 | 354 | 1,500 |
| orbit_releases | 103 | 133 | 250 |
| orbit_track_mvs / orbit_track_videos | 15 / 30 | 60 / 120 | 150 / 400 |
| attendance（heavy / light / zero user別） | 10 / 3 / 0 | 100 / 3 / 0 | 1,000 / 3 / 0 |
| on-this-day（7/19）を持つ過去年数 | 1 | 4 | 13 |

シナリオは 3 種 × 各サイズ: today `(2026-07-19)` / 同月 selected `(2026-07-05)` /
12か月 window 外 selected `(2024-03-10)`。execution plan 採取時の attendance は
heavy / light の 2 ユーザーで実行した。レビュー後の現行 driver は、空結果 contract の
回帰検知用に zero user も実行する。
日付分布の詳細は `supabase/perf-fixtures/README.md` を参照。

## 3. 計測結果（size 間比較）

数値は 3 シナリオの範囲（min–max）。duration はローカル環境の参考値であり、判定は
plan 構造と scaling（rows / buffers の伸び方）を主根拠とする。全 query で temp / disk spill なし。

### Global reads（shared cache miss 時に実行される 9 query）

| Query | 指標 | small | medium | large |
|---|---|---|---|---|
| events range（`.or` date ranges） | scan | Seq Scan | Bitmap `idx_orbit_events_date_range`（一部 Seq） | Bitmap `idx_orbit_events_date_range` |
| | rows_removed / buffers | 114–117 / 35–89 | 5–215 / 52–103 | 5 / 50–104 |
| performances range | scan | Seq Scan | Bitmap `idx_orbit_live_performances_date` | 同左 |
| | rows_removed / buffers | 299–309 / 48–107 | 0 / 143–202 | 0 / 179–256 |
| releases range | scan | Seq Scan | Bitmap `idx_orbit_releases_release_date` | 同左 |
| | rows_removed / buffers | 94–96 / 2–77 | 0 / 2–74 | 0 / 2–74 |
| videos range RPC（UNION ALL・2 half-open window） | scan | Bitmap `idx_orbit_track_{mvs,videos}_published_on` | 同左 | 同左 |
| | rows_removed / buffers | 0 / 54–112 | 0 / 57–112 | 0 / 54–112 |
| member birthdays | scan | Seq Scan（roster 全件が仕様） | 同左 | 同左 |
| | rows_removed / buffers | 5 / 91–150 | 5 / 302–361 | 5 / 272 |
| events on-this-day RPC | rows_removed / buffers | 176–177 / 8–83 | 215–219 / 20–115 | 681–698 / 42–236 |
| performances on-this-day RPC | rows_removed / buffers | 260–263 / 11–74 | 349–353 / 10–90 | 1,476–1,495 / 51–207 |
| releases on-this-day RPC | rows_removed / buffers | 100–102 / 2–63 | 126–132 / 3–64 | 235–249 / 4–65 |
| videos on-this-day RPC | rows_removed / buffers | 41–43 / 12–83 | 168–178 / 20–126 | 519–548 / 32–229 |

- videos range RPC は buffers が **3 サイズで完全に一定**（54–112）で、archive 量に依存しない
  bounded work の最良例
- on-this-day 系 4 RPC は月日抽出 filter のため Seq Scan + 線形 rows_removed（§5 W-2）。
  large でも実行 ≤ 2.7ms、sort は in-memory 25–29kB
- RPC 呼び出し wrapper（PostgREST の `SELECT function()` + JSON 集約）の buffers は
  サイズ非依存で 数百–1,500 程度（初回 catalog 参照を含む定常 overhead）

### Recent Attendance（personal、RLS: `has_orbit_read_role()` AND `user_id = auth.uid()`）

| User | 指標 | small(10件) | medium(100件) | large(1,000件) |
|---|---|---|---|---|
| heavy | buffers / duration | 102 / 2.5ms | 1,004 / 3.6ms | 12,024 / 24.8ms |
| light(3件) | buffers / duration | 32 / 1.4ms | 32 / 1.2ms | 40 / 1.5ms |

- 取得起点は常に `orbit_live_attendances_user_id_performance_id_key` の Bitmap Index Scan
  （本人行のみ。他ユーザーの参加記録には触れない）で、sort は top-N heapsort 28kB、
  返却は LIMIT 3 を維持
- work は **archive 全体ではなく本人の参加記録数に線形**（§5 W-1）。light user は全サイズで一定

## 4. Decision rule への適用と判定

Issue #383 の Decision rule「small / medium / large で計画と実行量が安定し、不要な scan や
disk sort がなければ検証のみで完了可能」に対して:

- 計画は安定（サイズに応じた Seq → Bitmap Index の切り替えは planner の正常な適応）
- disk sort / temp spill なし、buffer 増大は W-1 / W-2 の既知構造のみ
- 不要な full scan なし（on-this-day の Seq Scan は index が存在し得ない月日抽出 filter による設計上の形）

**よって index / RPC / query 変更は提案せず、validation-only で完了する。**

## 5. Watch items（変更提案ではない）

### W-1: Recent Attendance の work は本人参加記録数に線形

- evidence: buffers 102 → 1,004 → 12,024（本人 10 → 100 → 1,000 件）。payload は LIMIT 3 で bounded
- 原因構造: sort key（`performance_date`）が join 先テーブルにあるため、本人全行を join してから
  top-N を取る。他ユーザーのデータ量には無関係で、RLS 境界も維持されている
- 判断: 1,000 件（12年 × 約80回/年の heavy fan 相当）で 24.8ms / 全 buffer hit であり問題としない。
  production で本人参加記録が数千件規模の実ユーザーが現れ、p95 が問題化した場合のみ、
  attendance への日付非正規化や date-first join 等を evidence 付きで別 Issue 提案する

### W-2: on-this-day 系 4 RPC は archive 全行 filter（線形）

- evidence: rows_removed が archive に比例（events: 177 → 698、performances: 263 → 1,495）。
  実行時間は large でも ≤ 2.7ms
- 原因構造: 月日抽出（`EXTRACT(month/day)`）filter は既存の btree date index を使えない
- 判断: Top Page read は shared cache（#365 / #382 の tag invalidation 付き）で amortize され、
  DB 到達は cache miss 時のみのため問題としない。archive が今回の large（約13年分）を大きく
  超える見込みが出た場合のみ、`(EXTRACT(month), EXTRACT(day))` の expression index を
  evidence 付きで別 Issue 提案する

## 6. Verification Record

| Verification | Result |
|---|---|
| production data への write | なし（ローカルスタックのみ） |
| RLS / authenticated role 込みの plan | Pass（`has_orbit_read_role` InitPlan / nested statement を plan 上で確認） |
| `SECURITY INVOKER` / verified user 境界 | 維持（migration 変更なし） |
| execution plan 採取時の 3 シナリオ × 3 サイズ | 全 pass（各 5 tests、attendance ≤ 3 / nextEvents ≤ 4 を assert） |
| レビュー後 driver の fixture_small 再実行 | 全 pass（6 tests。global positive control、light=3、zero=0 を追加） |
| plan 回収数 | 各サイズ 204 plans（query セットがサイズ非依存で一致） |
| disk sort / temp file | ゼロ |

代表 plan（large、全 10 対象 + attendance heavy/light、機密情報除去済み）:
[実行計画 Appendix](./2026-07-19-sakalog-top-page-db-execution-plan-validation-plans.md)

## 7. Traceability

- 起点: 2026-07-19 Read Performance Audit P2-003 / Issue #383
- 次回 final Performance Audit は、本判定（validation-only 完了）と W-1 / W-2 の watch 条件を
  前提として引き継ぐ。再計測が必要な場合は `scripts/perf/README.md` の runbook で再現する
