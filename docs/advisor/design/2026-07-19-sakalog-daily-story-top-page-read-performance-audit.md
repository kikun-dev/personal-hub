# Sakalog Daily Story Top Page Read Performance Audit

- 実施日: 2026-07-19 JST
- 対象: Issues #365 / #366、PRs #379 / #380完了後のTop route（`/`）
- 対象commit: `99581177826ba1d71a4daf63e874379b49827705`（`main`）
- 実行条件: production Next.js build、service-role unavailable fallback、authenticated Chromium
- 起点: [2026-07-15 Primary Journey Technical Audit](./2026-07-15-sakalog-primary-journey-technical-audit.md) TA-P2-004 / CF-R07
- 判定: #365 / #366は主目的を達成済み。再オープンせずcompletedのまま維持し、残課題は独立したFollow-up Issueで追跡する。

この文書は2026-07-19時点のpoint-in-time reportである。後続実装の結果で本文やscoreを上書きせず、各Follow-up Issueと次回Performance Auditで差分を記録する。

## 1. Executive Summary

#365と#366により、Top Pageのbounded read、rows bound、page-level並列化という主目的は達成された。global readのrepository call数は入力archive量に依存しない9 callsとなり、Recent Attendanceは最大3 rows、globalとpersonalのpage-level readは並列化された。

残るP2は3件で、既存Issueへ混ぜずDecision 1件、Refactor 2件へ分離した。いずれも#365 / #366を未完了とする根拠ではない。

- Audit Health Score: **17/20（Good）**
- Findings: **P0 0 / P1 0 / P2 3 / P3 0**
- Decision: **#365 / #366 completedを維持**
- `$impeccable optimize`: **未実行**。Issue Decisionとscope確定後、必要な対象だけで使用する。

## 2. Technical Health Score

| Dimension | Score | 判定 |
|---|---:|---|
| Accessibility | 3/4 | 今回のread変更によるprimary journeyのaccessibility regressionは確認しなかった。 |
| Performance | 2/4 | bounded readと並列化は成立。auth budget、shared cache contract、実DB planのevidenceが未確定。 |
| Responsive Design | 4/4 | 今回対象のTop Page状態表示は320 / 390 / 1440pxで維持された。 |
| Theming | 4/4 | light / darkの回帰は確認しなかった。 |
| Anti-Patterns | 4/4 | read model変更にUI反復や不要なpresentation abstractionを持ち込んでいない。 |
| **Total** | **17/20** | **Good** |

## 3. Achieved Outcomes

### #365 — Bounded global reads

- logical repository callsは、small / medium / large archiveで変更前 `12 / 16 / 34`から変更後 `9 / 9 / 9`になった。
- transport instrumentationでもglobal readの実call数は9 callsだった。
- large archive stubの返却rows相当は318から16へ減り、archive全体の増加に比例しない。
- on-this-dayとrange queryをDB境界へ移し、video rangeは最大2つのhalf-open windowを`UNION ALL`するRPCへ集約した。
- 追加したbounded read RPCは`SECURITY INVOKER`を維持し、RLS / authenticated user境界を弱めていない。

### #366 — Bounded personal read and page-level parallelism

- Recent Attendanceは1 call、最大3 rowsとなり、全attendance履歴をpageへ返さない。
- Top routeはglobal contentとpersonal attendanceを同一page phaseで並列実行する。
- shared global cacheへpersonal dataを混入しない境界を維持した。
- Recent Attendanceは新規RPCを追加せず、認証付きSupabase clientからのqueryとattendance RLS（`has_orbit_read_role()` + `user_id = auth.uid()`）を維持し、service-role / shared cache経路へ載せていない。

## 4. Runtime Evidence

計測値はlocal環境からremote Supabaseへ接続したpoint-in-time sampleであり、production SLOではない。

| Scenario | Evidence |
|---|---|
| Fully warm TTFB — today | median 約152 ms |
| Fully warm TTFB — selected date outside window | median 約120 ms |
| Encoded HTML body — today | 20.4 KB |
| Encoded HTML body — selected date | 19.9 KB |
| Cold first request | 約6.0〜6.3 s |
| Stabilization前に観測したoutlier | 約9.3〜11.3 s |
| Cold global batch | 9 callsが約4.84〜4.92 sの単一parallel batch |
| Cold attendance read | 約4.85 s |

cold latencyはlocal-to-remoteのregion / connection variabilityを含む。今回の証拠から、値そのものをproduction budgetとして固定しない。

### Route remote call inventory

steady route fetchでは次の12 remote callsを観測した。

| Boundary | Calls | Note |
|---|---:|---|
| Proxy auth `getUser` | 1 | route guard |
| Page `requireOrbitUser` auth `getUser` | 1 | verified user boundary |
| Global bounded reads | 9 | shared cache miss / unavailable path |
| Personal Recent Attendance | 1 | user-scoped、最大3 rows |
| **Total** | **12** | token refresh / JWKS取得は条件付きで追加され得る |

data readの9 + 1はboundedになった。一方、route budgetでauthを1 callとして扱うと実装の二重検証を表現できないため、Decisionを独立させた。

## 5. Findings

### P2-001 Top routeのauth検証境界とremote call budgetが未決定

- Proxyの`getUser`とpageの`requireOrbitUser`内`getUser`により、auth remote callは通常2 calls。
- 二重検証はproxy guardとverified user boundaryを明瞭に保つ一方、budget上は重複callとして扱う必要がある。
- safe context handoffやclaimsとの役割分担は、RLSと検証境界を弱めない条件でDecisionが必要。
- 第一候補は、二重検証を維持しroute budgetを`auth: 2`として正式化すること。実装はDecision後に必要な場合だけ別Issueにする。
- Tracking: [#381 Top routeのauth検証境界とremote call budgetを決定する](https://github.com/kikun-dev/personal-hub/issues/381)

### P2-002 Shared cacheのhit・key・invalidation contractが自動検証されていない

- 現在のunit testは`getTopPageContent`へstub repositoryを注入する経路が中心で、`createSharedReadLoader / unstable_cache`を通らない。
- 同一variantのcache hit、today / selected dateのkey分離、domain mutationのtag invalidationをregression testとして固定できていない。
- cache unavailable fallbackとpersonal data非混入も、shared cache実経路のcontract testが必要。
- 最終Performance Audit前の必須対応とする。
- Tracking: [#382 Top Page shared cacheのhit・key・invalidation contractを自動検証する](https://github.com/kikun-dev/personal-hub/issues/382)

### P2-003 Bounded resultは実DBでのbounded workをまだ証明しない

- stubでのcall数とresult rowsはboundedだが、実DBのrows scanned、sort、buffers、index利用は未計測。
- Recent Attendance、on-this-day RPC、video range RPC、各range queryをsmall / medium / large archive fixtureで検証する必要がある。
- `EXPLAIN (ANALYZE, BUFFERS)`を保存し、問題がある場合だけindex・RPC・query変更を提案する。問題がなければvalidation-onlyで完了可能。
- Tracking: [#383 Bounded Top Page readの実DB execution planを検証する](https://github.com/kikun-dev/personal-hub/issues/383)

## 6. Follow-up Issue Traceability

| Issue | Type | Audit Finding | Scope |
|---|---|---|---|
| [#381](https://github.com/kikun-dev/personal-hub/issues/381) | Decision | P2-001 | auth validation boundaryとroute remote call budget |
| [#382](https://github.com/kikun-dev/personal-hub/issues/382) | Refactor | P2-002 | shared cache hit / key / invalidation / fallback / personal boundary contract |
| [#383](https://github.com/kikun-dev/personal-hub/issues/383) | Refactor | P2-003 | bounded readの実DB execution plan evidence |

#365 / #366へこれらのscopeを戻さない。#381のDecisionで実装が必要と決まった場合も、実装は別Issueとして起票する。

## 7. Verification Record

| Verification | Result |
|---|---|
| `pnpm build` | Pass。Google Fonts取得のためnetwork accessを許可して実行。 |
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| Unit tests | 49 passed |
| Top Page Playwright suites | 45 passed / 3 intentional skips |
| Performance detector | Findingsなし |
| `git diff --check` | Pass |
| 2-user isolation | service keyがないためskip |
| Shared cache enabled-path contract | 未実施。#382で追跡。 |
| 実DB `EXPLAIN (ANALYZE, BUFFERS)` | 未実施。#383で追跡。 |

## 8. Final Decision

#365と#366はcompletedのまま維持する。bounded read、rows bound、page-level並列化という受け入れ目的は達成しており、今回のP2 3件はそれぞれDecisionまたはvalidation contractの独立した残課題である。

次回は#381でauth boundaryとbudgetを決定し、#382を最終Performance Audit前に完了する。#383は実DB evidenceを取得してから変更要否を判断する。最適化手法を先に選ばず、Decisionとscopeが確定した対象に限って`$impeccable optimize`を使用する。
