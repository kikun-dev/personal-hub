---
target: Sakalog ライブ／公演／セットリスト閲覧フロー
total_score: 24
p0_count: 0
p1_count: 3
timestamp: 2026-08-04T08-51-27Z
slug: app-authenticated-lives-page-tsx
---
Method: dual-agent (A: `/root/live_critique_a` · B: `/root/live_critique_b`)

# Sakalog ライブ／公演／セットリスト Impeccable Critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | 件数、参戦状態、`1 / 12`、「この公演」は明快 |
| 2 | Match System / Real World | 4 | 会場・開場/開演・本編/アンコール・C表記が自然 |
| 3 | User Control and Freedom | 2 | browser historyは良いが、可視backが閲覧元でなくresource一覧へ戻す |
| 4 | Consistency and Standards | 3 | 部品は揃うが、経路によりdetail構成とbackの意味が変わる |
| 5 | Error Prevention | 3 | 閲覧中心で誤操作リスクは低く、参戦未記録も明示 |
| 6 | Recognition Rather Than Recall | 2 | 公演日・元setlist・絞り込みを運べず、再探索が必要 |
| 7 | Flexibility and Efficiency | 2 | トップのdeep linkは良いが、一覧はgroup以外の検索・年・直接ジャンプなし |
| 8 | Aesthetic and Minimalist Design | 2 | 静かだが、62 cards・12公演・全formationの反復が主題を埋める |
| 9 | Error Recovery | 2 | historyは復帰するが、Empty/Errorの回復導線が一貫しない |
| 10 | Help and Documentation | 1 | `C:`、「フル」、披露回数と公演の関係の説明なし |
| **Total** |  | **24/40** | **Acceptable — 情報構造とnavigation contextに大きな改善余地** |

## Anti-Patterns Verdict

**LLM assessment:** 「AI製」と即断される見た目ではない。グループ色、8px程度の角丸、影を濫用しない白黒基調は`DESIGN.md`に忠実で、トップの今日・過去・次の予定はSakalog固有の人格を持つ。一方、下層は62枚のidentical card grid、曲card内のformation card、31人・12公演・19曲の同等重量表示に戻り、データをcardへ流し込んだ印象が強くなる。

**Deterministic scan:** route 5件とlives/songs関連21件、計26 filesのCLI scanは0 findings。Browser overlayは5 viewに注入成功し21 console findings。Arial/single-font、flat hierarchy、purple badge、collapsed details内のline-lengthは設計意図または非表示によるfalse positive。実質的に残るのはlive detailの31人名簿（約178 chars/line）とsong detailの22人名簿（約173 chars/line）の2件。

**Visual overlays:** mutable injectionと実DOM overlayは5 viewで成功したが、user-visible browser surfaceがないため[Human] tabは残していない。認証付きheadless Chromiumのconsole countとoverlay screenshotをfallback証拠とした。

## Overall Impression

公演日と会場、曲順、収録releaseの語彙は正確で、トップから日付context付きで入る「この公演→次の公演」は非常に良い。最大の機会は、このperformance identityを一覧・setlist・song・releaseの全行程で保持すること。

## What's Working

1. 日付context付きlive detailは「この公演」「次の公演」「8/23の出来事へ戻る」を先頭に置き、Desktop/Mobileとも通常の12公演overviewより明快。
2. 本編・アンコール、OVERTURE、MC、EN1は視覚的に追え、曲名→song→release→別曲へのデータ横断価値も高い。
3. 公演carouselは44px以上の前後button、`role=status`、ArrowLeft/Right、offscreen focus抑制が機能する。Browser historyはscroll位置も復元した。

## Priority Issues

### [P1] ライブ一覧が62件の同型card壁

- **Why it matters:** 名称、年、開催状態、参加状態で探せず、Mobileの全件表示は7,114px。古い公演ほどコストが直線的に増える。
- **Fix:** `開催中 / 今後 / 過去`と年でchunkingし、名称検索、年、参加済み、setlist有無を追加。開催中は先頭に分離する。
- **Suggested command:** `$impeccable clarify`

### [P1] 公演選択が入口により別モードに分裂

- **Why it matters:** トップ経由は対象公演に直接着地するが、一覧経由は6会場と31人を越えた後、1/12から開始。Mobileで8/23まで9回の前後操作が必要。
- **Fix:** 通常detailにもperformance selectorを置き、今日/最近/選択公演をprimary surfaceへ。日程overviewを選択入口にする。
- **Suggested command:** `$impeccable shape`

### [P1] セットリストの「順番を見る」と「編成を研究する」が分離されていない

- **Why it matters:** 23 rows・19曲・11以上のformationが約3,900pxに連続し、Mobileでは最初の一画面に約2曲しか入らない。
- **Fix:** 番号・曲名・center・短い注記をsummaryにし、披露member/formationは曲単位disclosureへ。本編/アンコールjumpと差分viewを設計する。
- **Suggested command:** `$impeccable distill`

### [P1] 深掘り中の可視backがorigin provenanceを失う

- **Why it matters:** setlist→songのsong backは「楽曲一覧」、song→releaseのrelease backは「リリース一覧」。Browser Backを使わない人は元の公演と曲を再探索する。
- **Fix:** `7/23 setlist → What's \"KAZOKU\"? → 15th Single`のcontext trailを残し、直前contextとresource一覧を別の操作として定義する。
- **Suggested command:** `$impeccable clarify`

### [P2] 公演carouselが「1公演閲覧」か「公演比較」か曖昧

- **Why it matters:** counterは`1 / 12`だがDesktopは4 cardsを同時表示し、各cardの19曲が反復。選択状態と差分はcounterからしか読めない。
- **Fix:** 1公演が主ならactive card + date selector + 前後公演、比較が主なら2–4公演を明示選択して曲差分を出す。
- **Suggested command:** `$impeccable shape`

## Cognitive Load

8項目中4項目がFail。Single focus、Grouping、One thing at a time、Minimal choicesの一部は成立。Chunking、Visual hierarchy、Working memory、Progressive disclosureが失敗。主因は62 livesのフラット走査、一覧経由の12公演再探索、setlist formationの全展開。

## Emotional Journey

トップの「今日」で個人archiveのピークを作り、日付context detailの「この公演→次の公演」で安心できる。谷はライブ一覧の台帳化と、3,900px setlistの詳細壁。song/releaseの知的報酬は大きいが、可視backで旅程が切れend experienceが弱い。

## Persona Red Flags

- **Alex（Power User）:** 62件に名前検索・年jumpなし。12公演を1件ずつ送り、19曲差分を手作業で比較する。
- **Jordan（First-Timer）:** `C:`、「フル」、`BACKS`、「表題」の説明なし。`1 / 12`で4 cardsが見え、activeな公演が曖昧。
- **Casey（Distracted Mobile）:** 通常detailは6会場cardを超えて公演へ。Setlistは中断復帰時の現在曲が分かりにくい。日付context、44px carousel button、history scroll restorationは良好。

## Minor Observations

- 31人の出演memberは`/`区切りの一段落で、世代・選抜・centerを拾いにくい。
- Mobile setlistの「編集」は約28×20pxのtext linkで、他の編集buttonと不統一。
- Context detailの「参戦記録 / 参戦記録はまだありません」は意味が重複。
- Mobile/Desktopともpage-level horizontal overflowなし。長い英語titleも折り返した。

## Questions to Consider

Questions skipped: 本turnはユーザーが監査結果の確定を求めており、一覧の主目的・公演比較モデル・back優先度の設計質問は「設計判断が必要」に分類し、次段階へ残す。
