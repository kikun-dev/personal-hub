# ADR 0015: Top routeのauth検証境界とremote call budget

## Status

Accepted

## Context（背景）

SakalogのTop route（`/`）は、グローバルデータと本人限定のRecent Attendanceを同じ画面で
合成する。グローバルデータはADR 0006のservice role + shared cache経路を利用できる一方、
Recent AttendanceはADR 0009に従い、認証付きclientとRLSを通して都度取得する。

Issues #365 / #366完了後のPerformance Auditで、Top route全体には次の2つの
`supabase.auth.getUser()`が存在することを確認した。

1. proxy: route admissionとadmin / viewerのrole guard
2. page: `requireOrbitUser()`によるpersonal read開始前のverified user確認

page単体ではauth 1 callと整理していたが、route全体では通常2 callsである。これは同じ処理の
偶発的な重複ではなく、RLSを迂回するshared readと本人限定readを別々に守る境界である。
1 call削減のためにsecurity boundaryを暗黙に統合せず、実装と計測基準を一致させる必要がある。

## Decision（決定）

### 1. 二重検証を維持する

proxyとpageの`getUser()`をどちらも維持し、Top routeのsteady-state auth budgetを
**2 remote calls**として正式化する。

- proxyはroute admission、admin / viewer role guard、必要時のtoken refreshを担う
- pageの`requireOrbitUser()`はpersonal read開始前のverified current user境界を担う
- Repositoryは認証付きclientを使用し、RLSは`auth.uid()`で本人行だけに制限する
- performance目的でpersonal dataをservice roleやshared cacheへ移さない

productionの認証・認可コードは変更しない。#365 / #366は再オープンせず、実装Issueも
追加しない。

### 2. Trust boundaryと責務

| 境界 | 信頼する入力 | 責務 | 認可上の位置づけ |
|---|---|---|---|
| Browser / cookie | なし。cookieは未検証入力 | access / refresh tokenをrequestへ載せる | 認可判断には直接使わない |
| Proxy | Auth serverが`getUser()`で検証したuser | route admission、role guard、token refreshとcookie更新 | service-role shared readを守る必須guard |
| Authenticated layout | `getClaims()`で署名検証したclaims | Header等のUI表示制御 | 認可には使用しない。失敗時は非admin表示へfail closed |
| Top page / `requireOrbitUser()` | page境界で再度`getUser()`したuser | personal read開始前のverified user確認 | proxyと独立したdefense in depth |
| Authenticated Repository / PostgREST | requestのaccess token | personal data query | service role / shared cacheを使わない |
| RLS | `auth.uid()`と`has_orbit_read_role()` | 本人行だけに制限 | 他user行へのアクセスを拒否する最終境界 |

layoutの`getClaims()`は署名・期限を検証したclaimsを返すが、このアプリでは引き続きUI表示制御
専用とする。未検証の`getSession().session.user`を認可判断には使用しない。

### 3. Route-level remote call budget

データreadの前提は次のとおり。

- global shared read: cache hit 0 / cache miss 9
- personal Recent Attendance: cache hit / missとも1（rowsは最大3）

primary budgetは非対称署名JWT、WebCrypto利用可能、JWKS warmをsteady stateとする。
proxyがrefreshしたtokenはrequest cookieへ反映し、同じrequestのServer Componentsが
再refreshしない現在のSSR構成を維持する。

| Scenario | Auth remote calls | Route total（global cache hit） | Route total（global cache miss） |
|---|---:|---:|---:|
| steady state / fresh token / JWKS warm | **2**（proxy user 1 + page user 1） | **3** | **12** |
| token refresh / JWKS warm | **3**（refresh 1 + proxy user 1 + page user 1） | **4** | **13** |
| fresh token / JWKS cold | **3**（steady 2 + JWKS 1） | **4** | **13** |
| token refresh + JWKS cold | **4** | **5** | **14** |

互換条件は次のように扱う。

- 対称署名JWT、WebCrypto非対応、または`getClaims()`がserver verificationへfallbackする
  環境では、layout verificationのremote callを上表へさらに`+1`する
- ephemeral runtimeではprocess-local JWKS cacheがinvocationをまたいで残らない場合があるため、
  JWKS fetchを条件付きbudgetとして扱う
- auth失敗時のretryや外部障害は通常budgetに含めず、error / availabilityとして別計測する

### 4. Monitoring / observability

route-level計測では、remote callsを次のカテゴリへ分ける。

- Auth user validation: `/auth/v1/user`
- Token refresh: `/auth/v1/token`
- Signing key discovery: `/.well-known/jwks.json`
- Global data: shared readのPostgREST / RPC
- Personal data: Recent AttendanceのPostgREST

steady-stateの回帰基準は`auth 2`とする。token refreshとJWKS coldは条件付き増分として分離し、
global cache hit / missも別々に記録する。latencyはruntime regionやcold startの影響を受けるため、
本ADRでは固定SLOを定めず、call数と境界別内訳を回帰基準とする。

## Rejected Options（不採用案）

### B. proxyからverified contextをpageへ引き継ぐ

steady-state authを1 callへ減らせるが、header / cookie等のcontextについて、改ざん耐性、
proxyを迂回できないこと、trust sourceとlifetimeを新たに保証する必要がある。1 call削減に対して
security surfaceと保守コストが増えるため採用しない。

### C. `getUser()` / `getClaims()` / session clientの役割を再分担する

`getClaims()`はverified JWT境界として利用でき、非対称署名では通常ローカル検証できる。一方で
`getUser()`と異なり、server-side logoutやuser recordの最新状態をAuth serverへ毎回確認しない。
`requireOrbitUser()`はTop page以外のServer Components / Actionsでも利用されるため、変更には全利用箇所の
security semantics再監査が必要である。現在のP2改善の便益に見合わないため採用しない。

## Consequences（結果・影響）

### 良い点

- service-role shared read、personal read、RLSの多層防御を維持できる
- 現行実装とroute-level call budgetの不一致が解消される
- refresh / JWKS coldをsteady regressionと区別して観測できる
- productionコード変更がなく、認証・redirect・RLS behaviorのregression riskがない

### 悪い点

- Top routeはsteady stateでもAuth serverへ2回通信する
- proxyとpageの検証結果を同一request内で共有しないため、1 call構成よりremote latencyが増える
- signing方式やruntime特性により、layoutの`getClaims()`が追加remote callになる場合がある

## Revisit Conditions（見直し条件）

次のいずれかが確認された場合は、独立したDecision IssueでBまたはCを再検討する。

- production計測で2回目の`getUser()`が主要なlatency bottleneckになった
- Next.js / Supabaseが改ざん耐性のあるrequest-scoped verified contextを公式に提供した
- server-side logoutの反映要件とJWT expiryの許容範囲を変更した
- `requireOrbitUser()`の全利用箇所を同じverified-claims contractへ移行する必要が生じた

## Notes

- Decision Issue: #381
- Source audit: `docs/advisor/design/2026-07-19-sakalog-daily-story-top-page-read-performance-audit.md`
- Related: ADR 0006（shared read cache）、ADR 0008（認可）、ADR 0009（personal data）
- Supabase documentation:
  - https://supabase.com/docs/reference/javascript/auth-getuser
  - https://supabase.com/docs/reference/javascript/auth-getclaims
  - https://supabase.com/docs/guides/auth/server-side/creating-a-client
  - https://supabase.com/docs/guides/auth/server-side/advanced-guide
