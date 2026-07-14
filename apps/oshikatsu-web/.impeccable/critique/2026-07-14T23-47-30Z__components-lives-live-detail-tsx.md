---
target: "Issue #346 / PR #354 Contextual Live Detail（HEAD 19e2b0b）"
total_score: 38
p0_count: 0
p1_count: 0
timestamp: 2026-07-14T23-47-30Z
slug: components-lives-live-detail-tsx
---
Method: single-agent (PR #354 latest HEAD + current screenshot artifacts + previous critique delta)

## Design Health Score

| # | Heuristic | Score | Key observation |
|---|---|---:|---|
| 1 | Visibility of System Status | 4/4 | 戻り導線、先頭着地、「この公演」で選択contextが明快。 |
| 2 | Match System / Real World | 4/4 | 日付・時刻・地域公演・会場の語彙と順序が自然。 |
| 3 | User Control and Freedom | 4/4 | 元の日付へ戻れ、overviewも明示的に展開・折りたたみできる。 |
| 4 | Consistency and Standards | 4/4 | Sakalogのneutral border、8px角丸、TextLink、既存type scaleを維持。 |
| 5 | Error Prevention | 4/4 | setlistなしを壊れた空欄や管理状態として見せず、surfaceを自然に完結。 |
| 6 | Recognition Rather Than Recall | 4/4 | 選択performanceを再探索せず日時・公演・会場を理解できる。 |
| 7 | Flexibility and Efficiency | 4/4 | overviewは初期4会場、Desktop 2列、必要時のみ全件展開。 |
| 8 | Aesthetic and Minimalist Design | 4/4 | primary / secondary / overviewをedge強度と密度で静かに分離。 |
| 9 | Error Recovery | 2/4 | 有効context中心のIssueであり、fallback再設計は明示的に範囲外。 |
| 10 | Help and Documentation | 4/4 | UI copyだけで戻り・現在公演・次・全体の関係を理解できる。 |
| **Total** |  | **38/40** | **Strong — Issue #346のdesign directionとして採用可。** |

## Verdict

Issue #346のデザイン方向として採用できる。前回critiqueのP2 2件、P3 1件は最新HEAD `19e2b0b` で解消され、Issue #346の範囲内に新たなP0〜P3 design Findingはない。

ただしPR #354全体のマージ可否は別で、既存レビューコメントのtechnical P1 / P2が最新HEADにも残る。特にP1は本番shared cacheの旧shapeから `performanceId` が欠けると、トップからのリンクが `performance=undefined` になり、有効contextではなくfallbackへ着地し得る。

## Anti-Patterns Verdict

AI slopは認めない。巨大Hero、accent色による選択状態の捏造、gradient、glass、広いshadow、過剰なcard反復、重複status UIはない。

- Meaningful Color / Group Ownership: group colorはGroupBadgeに限定し、contextはcopyと位置で表現。
- Earned Lift / One Edge: primary `/25`、secondary `/10` の単一borderで階層化し、shadowを重ねない。
- Compact Clarity: この公演は必要情報を保持し、overviewは段階開示で初期量を抑制。
- 「楽しくても騒がしくしない」: visual referenceのpink accentを模倣せず、Sakalogのneutral surfaceへ翻訳。

## Resolved Findings from Previous Critique

### Resolved — setlistなしのprimary surface

`components/lives/LiveDetail.tsx:440-456` で、楽曲が存在する場合だけsetlist sub-moduleを描画する。未来公演で自然な「まだない」状態を「未登録」という管理状態に見せず、見出しだけ残る空洞も解消した。新しいempty cardや説明copyを増やしていない点も適切。

### Resolved — tour overviewの量と幅

`components/lives/TourOverview.tsx:27-83` で、初期4 group、Desktop 2列、Mobile 1列、明示的な展開・折りたたみへ変更した。初期縦量を抑えながら全日程へのアクセスを失わず、「この公演 > 次の公演 > 公演・日程」のvisual weightを維持している。`aria-expanded`も付与されている。

### Resolved — 長いdescriptionによるprimary押し下げ

有効contextでは `この公演` と `次の公演` の後へdescriptionを置き、選択した1公演をfirst viewportで読む目的を優先した。fallbackでは従来位置を維持しており、Issue外の直接訪問compositionを変えていない。

## Current Design Findings

Issue #346の範囲内に、PR前の追加修正を要するdesign Findingはない。

## PR Readiness — Non-design Findings

### [P1] shared top-page cacheのschema versionが更新されていない

- **Location:** `usecases/readOrbitMusicData.ts:35-36`、`components/events/EventListItem.tsx:79-84`
- **Evidence:** `LiveCalendarEvent.performanceId` を必須化してリンクへ使用する一方、shared loader keyは既存の `orbit / top-page-data` のまま。loader wrapper自体は変わらず、内部の `getTopPageContent` の返却shapeだけが変わるため、旧Data Cache entryを再利用し得る。
- **Impact:** 旧cacheでは `performanceId` がなく、`performance=undefined` となる。context validationに失敗し、Issue #346のprimary surfaceではなくfallbackへ着地する可能性がある。
- **Recommendation:** cache keyをversion bumpする。新旧shape境界を検証する回帰テストまたはdeploy verificationも加える。
- **Issue #346 scope:** 範囲内の導線成立条件。PR前に修正必須。

### [P2] future date groupのstable-order規約と実装が一致しない

- **Location:** `usecases/performanceChronology.ts:31-47`
- **Evidence:** コメントは「同日に時刻不明を含む場合は入力順の先頭」とするが、入力 `[18:00, null, 16:00]` では18:00を候補にした後、16:00が既知時刻比較で置換し、入力先頭を維持しない。
- **Impact:** データ順と時刻欠損の組合せにより「次の公演」が規約と異なるperformanceを示す。secondary surfaceの内容自体が不安定になる。
- **Recommendation:** まず最小のfuture dateを確定し、その日付group全体にnullがあるかを判定する。全件時刻ありなら最早時刻、1件でもnullなら入力先頭を返す。mixed time fixturesのunit testを追加する。
- **Issue #346 scope:** 範囲内の「次の公演」判定。PR前に修正推奨。

## Cognitive Load

着地後にユーザーが保持する必要がある情報は「戻り先」「この公演」「次」の3段階へ整理された。overviewは初期4会場に限定され、ツアー全件を読み切らないと全体像が得られない負荷も減った。setlistなしでは何も説明しないことが曖昧さではなく、存在する情報だけを読む自然な省略として働いている。

## Emotional Journey

- **着地:** 元の日付へ戻れる安心感がある。
- **この公演:** 選んだ対象を静かに、迷わず確認できる。
- **次の公演:** ツアーの連続性をsecondary surfaceとして感じられる。
- **overview:** 必要な人だけ広げられ、管理表を強制的に読まされる感覚が減った。

## Visual Reference Translation

### 十分翻訳できている

- 「戻り → 選択公演 → 次 → 全体」のcomposition。
- referenceのaccentをneutral edge strengthとcontent densityへ変換。
- 複数next cardではなく、Decisionどおり確定した次の1公演へ収束。
- overviewを同型card反復にせず、compact grid + progressive disclosureへ変換。
- 戻り・見出し・先頭配置だけでcontextを伝え、status badgeを増やしていない。

### 未翻訳として残る点

Issue #346の範囲内にはない。AttendanceControl内部の再設計や参加行動との隣接はIssue #347へ残すのが妥当。

## Scope-out Supplements

- AttendanceControl内部、参加記録の各状態、Issue #347 Attendance Adjacency。
- fallback直接訪問UI、Calendar、Daily Story、全アプリ共通polish。
- Product / Design正典自体の変更。

## Verification Notes

- Current HEAD: `19e2b0b`。
- PR差分、最新3コミット、Desktop 1440px / Mobile 390px screenshot artifacts、前回snapshotとの差分を照合。
- 最新Mobileの再撮影は行っていない。最終commitのvisual差分はsetlist sub-moduleの条件付き省略のみで、current Desktop artifactとTSXのresponsive ruleから確認した。
- Impeccable detector: 対象TSXで0 findings。
- `pnpm typecheck`、`pnpm lint`、`git diff --check main...HEAD`成功。
- code / UI / PRODUCT.md / DESIGN.mdは変更していない。

## Trend

Design Health Score: **35 → 38**。前回のP2 2件・P3 1件は解消。design P0/P1は引き続き0。
