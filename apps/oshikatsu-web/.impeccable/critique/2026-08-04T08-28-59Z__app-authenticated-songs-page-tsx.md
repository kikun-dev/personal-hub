---
target: Sakalogの楽曲閲覧フロー（一覧→詳細→リリース・ライブ・セットリスト→戻り）
total_score: 27
p0_count: 0
p1_count: 4
timestamp: 2026-08-04T08-28-59Z
slug: app-authenticated-songs-page-tsx
---
Method: dual-agent (A: /root/member_critique_a · B: /root/member_critique_b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | 件数とcarousel statusは良いが、該当披露公演が見えない。 |
| 2 | Match System / Real World | 4/4 | release、参加者、formation、setlistの語彙が自然。 |
| 3 | User Control and Freedom | 2/4 | 関連先の可視戻りが曲・検索文脈へ戻らない。 |
| 4 | Consistency and Standards | 3/4 | Card/Badgeは一貫、PendingLinkと素のLinkが混在。 |
| 5 | Error Prevention | 3/4 | filter制約は良いが、該当公演を誤探索しやすい。 |
| 6 | Recognition Rather Than Recall | 2/4 | 曲→live後に12公演から再探索する。 |
| 7 | Flexibility and Efficiency | 3/4 | 検索はあるがsort/groupingと検索永続化がない。 |
| 8 | Aesthetic and Minimalist Design | 3/4 | Mobileは端正、Desktop Cardとsetlist全展開が重い。 |
| 9 | Error Recovery | 2/4 | empty resetとoriginへ戻る回復モデルが不足。 |
| 10 | Help and Documentation | 2/4 | 総披露・自分の遭遇・該当公演の関係が説明されない。 |
| **Total** |  | **27/40** | **Acceptable — 関連contextとcollection scaleを改善** |

## Anti-Patterns Verdict

**LLM assessment:** AI slopは認めない。意味のあるBadge色、抑制された罫線、8px前後の角丸、過剰なshadow/gradient/glass/motionがなく、静かな情報面として信頼できる。

**Deterministic scan:** `app/(authenticated)/songs`、`components/songs`は0 findings。overlayの`single-font` / `overused-font`はDESIGN.mdのOne-Family Ruleに一致するfalse positive。

**Visual overlays:** `/songs`、song detail、live detailでmutable injectionとdetect.js読込に成功。Playwright fallbackのisolated headless tabで確認し、temporary live serverは停止済み。

## Overall Impression

曲を知る情報面としては静かで信頼できる。最大の機会は、677曲を「探せるcollection」にし、曲詳細の「4回披露」を実際の公演・セットリスト・個人記録へ一続きに変えること。

## What's Working

1. native select/searchと即時件数で、櫻坂46 113曲から1曲へ絞れる。
2. 収録→クレジット→参加者→formation→動画→披露の順が自然。
3. 一覧Cardのhover、2px focus、pending statusとlive carouselのstatus更新は成熟している。

## Priority Issues

### [P1] 曲から実際に披露された公演へ直接着地できない

- **Why it matters:** 「合計4回披露」のlink先は12公演のlive全体で、該当4公演を探し直す。個人セトリログでは同曲が1回となり概念差も説明されない。
- **Fix:** performance occurrenceを日付・会場・曲順で示し、target performance/setlist itemへdeep link・強調する。
- **Suggested command:** `$impeccable shape`

### [P1] 関連先の可視戻りが元の曲ではなくresource一覧へ向かう

- **Why it matters:** releaseの戻るは`/releases`、liveは`/lives`、setlistはlive先頭へ戻り、曲とperformance contextを失う。
- **Fix:** origin-aware RelationshipLink/Back contractを定義し、直接訪問時だけ一覧fallbackを使う。
- **Suggested command:** `$impeccable harden`

### [P1] タイトル検索が戻ると失われる

- **Why it matters:** `Lonesome` 1曲から詳細へ進み戻るとqueryが空になり18〜677曲へ戻る。
- **Fix:** `q`をURL filter contractへ統合し、back/reload/shareで復元する。
- **Suggested command:** `$impeccable harden`

### [P1] collectionを全件一括Cardとして扱う

- **Why it matters:** 初期677曲・3,668 DOM elements、櫻坂46だけでMobile 14,841pxになる。
- **Fix:** explicit sort、release/year grouping、段階表示/pagination/windowingのcollection modelを決める。
- **Suggested command:** `$impeccable optimize`

### [P2] Desktop detailとMobile setlistのdensityがtaskに適応しない

- **Why it matters:** song detailは1248px Card、setlistは18曲＋formationで3,903pxとなり、関係より視線移動とscrollが強い。
- **Fix:** song detailへreadable measure、setlistへsummary/detail disclosureとsong-origin anchorを導入する。
- **Suggested command:** `$impeccable distill`

## Cognitive Load

8項目中4項目Fail。Single focus、Grouping、One thing at a time、Minimal choicesは成立。Chunking、Visual hierarchy、Working memory、Progressive disclosureが失敗。主因は113曲のフラット走査、曲→12公演の再探索、setlist formationの全展開。

## Emotional Journey

櫻坂46を選び、曲名で見つけ、詳細の収録・参加・MV・披露を読むまでは安心して掘れる。谷は「4回披露」からliveへ移った瞬間で、12公演から探し直す。setlistは具体的な披露証拠として強い報酬だが、元の曲へ戻るcontextとMobile密度が最後の負担になる。

## Persona Red Flags

### Alex — 長期アーカイブ管理者

- 全公演集計4回と個人遭遇1回の違いを解釈し、該当公演を手で探す。
- 曲→release/live後の画面内戻りでoriginを失う。

### Casey — Mobileファン

- 櫻坂46 113曲Cardと3,903px setlistを長くscrollする。
- 検索語が戻ると失われる。

### Sam — Keyboard/低視力利用者

- related/backのdark focusが1px黒outline。
- center文字がlightで3.20:1。
- 一覧Cardとraw Linkでfocus/pending品質が異なる。

## Minor Observations

- Emptyはclear/reset actionなし、Loadingは空の40px fallback。
- MVは生URLで、新規tabのvisible labelがない。
- Mobile formationはcontained horizontal scrollでdocument overflowなし。
- Headless UI hydration warningはfresh desktop 1runのみで、production再現待ち。

## Questions to Consider

Questions skipped: 本turnは監査結果の確定を求められており、実装判断は次段階へ残す。
