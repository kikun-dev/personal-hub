---
target: "Issue #346 Contextual Live Detail（HEAD 6b5d2fe）"
total_score: 35
p0_count: 0
p1_count: 0
timestamp: 2026-07-14T21-23-03Z
slug: components-lives-live-detail-tsx
---
Method: dual-agent (A: live_detail_visual · B: live_detail_evidence)

## Design Health Score

| # | Heuristic | Score | Key observation |
|---|---|---:|---|
| 1 | Visibility of System Status | 4/4 | 戻り導線、先頭着地、「この公演」でcontextが明快。 |
| 2 | Match System / Real World | 4/4 | 日付・開場/開演・地域公演・会場の語彙が自然。 |
| 3 | User Control and Freedom | 4/4 | 元の日付へ明示的に復帰できる。 |
| 4 | Consistency and Standards | 4/4 | Sakalogの8px角丸、border、14px階層、TextLinkを再利用。 |
| 5 | Error Prevention | 3/4 | セットリスト0件の理由が表示されず、未描画と誤認し得る。 |
| 6 | Recognition Rather Than Recall | 4/4 | 選択performanceを再探索せず日時・公演・会場を理解できる。 |
| 7 | Flexibility and Efficiency | 3/4 | 多会場overviewが全件展開で長い。 |
| 8 | Aesthetic and Minimalist Design | 4/4 | accent模倣やカード反復を避け、surface差で階層化。 |
| 9 | Error Recovery | 2/4 | critique対象が有効context中心のため限定評価。 |
| 10 | Help and Documentation | 3/4 | copyは自己説明的だが、setlist emptyの説明がない。 |
| **Total** |  | **35/40** | **Good — 方向性は採用可。emptyとoverview密度を整えたい。** |

## Anti-Patterns Verdict

AI slopはほぼ認めない。画像2のpink border・badge・複数performance cardをpixel模倣せず、現行Sakalogのneutral border強度、padding、情報量でprimary/secondary/overviewを翻訳している。グラデーション、glass、広いshadow、過剰な丸み、巨大Hero、重複status chipはない。

Meaningful Color / Group Ownershipは準拠。色はGroupBadgeの所有情報に限定し、「この公演」は色ではなく言語とneutral borderで示す。Earned Lift / One Edgeも準拠し、primary `/25` border、secondary `/10` borderのどちらにもshadowはない。

## Overall Impression

Issue #346の方向として採用できる。戻り → live identity → この公演 → 次の公演 → 公演・日程という順序が成立し、旧LiveDetailの単なる並べ替えではない。有効contextでは全公演carouselを外し、選択1公演の専用surface、1件だけのnext surface、borderless overviewへ役割を分けている。

Desktop 1440px / Mobile 390pxとも「この公演」が初期viewport内に入り、横overflowはない。戻り導線は実操作で `/?year=2026&month=7&day=15` への復帰を確認した。

## What's Working

1. **Contextを重複UIなしで伝える。** 戻り導線、「この公演」、先頭配置だけで十分で、date status badgeや説明bannerを増やしていない。
2. **Primary surfaceが成立。** `/25` border、p4、full contentに対し、次は`/10` border・p3・compact、overviewはouter cardなしのhairline list。
3. **同日performanceを理解できる。** 日付と開場/開演を先頭行に置き、その下に地域公演、会場を置く。現在のfixtureでは選択公演を再探索せず判別できる。
4. **Nextが脚注化していない。** 独立h2とfull-width border surfaceを持つ一方、Attendance/CTA/相対日数を持たずsecondaryに留まる。
5. **Responsiveで階層を維持。** 長いlive/venue名はwrapし、next/overviewはflex-wrap。390pxで横overflowなし。
6. **静かなoverview。** selected/nextの後段で、カードgridではなくdividerと12–14pxの行リストを使う。

## Priority Findings

### [P2] セットリスト未登録時にprimary surface中央が未描画のように見える

- **Finding:** 曲が0件でも「セットリスト」と「詳細を見る →」だけを表示し、その直後にAttendanceControlへ移る。empty理由がない。
- **visual / composition上の根拠:** Desktop/Mobile画像のprimary cardではhairline下に見出しとlinkだけが残り、その下が空く。card全体は日時・公演・会場で成立しているが、このsub-moduleだけ読み込み漏れまたは登録済み空データのように見える。
- **Issue #346 / DESIGN.md上の根拠:** 対象条件「セットリスト未登録時に『この公演』surfaceを不自然に空洞化させない」、Compact Clarity、「選んだ1公演を読む画面」。
- **対象箇所:** `components/lives/LiveDetail.tsx:434-445`、`PerformanceSetlistSummary`の0件return。
- **Issue #346の範囲内か:** 範囲内。
- **推奨対応:** 同じsub-module内へ12px程度の「セットリストは未登録です」または「楽曲情報はまだありません」を表示する。詳細linkを残す場合はempty pageへ進む意味が分かるcopyにする。新しいカード、色、shadowは追加しない。
- **PR前:** 修正推奨。

### [P2] tour overviewは視覚的には静かだが、全件展開の量がoverviewを超えている

- **Finding:** 多会場tourで全venue group・全performanceを単列表示するため、overviewがページ内で最大の縦領域になる。
- **visual / composition上の根拠:** 現行fixtureではoverview約703pxに対し、この公演約201px、次の公演約70px。初期視線順はprimaryが勝つが、Mobileではoverviewだけでほぼ1viewport、Desktopでは約992px幅の単列に大きな横余白が残る。
- **Issue #346 / DESIGN.md上の根拠:** Implementation Decisionの「ツアー全体を静かに把握」、判断基準「overviewが主役を奪わない」、PRODUCTの「情報量が多くても落ち着いて見続けられる」。
- **対象箇所:** `components/lives/LiveDetail.tsx:490-537`。
- **Issue #346の範囲内か:** 範囲内。
- **推奨対応:** Desktopはvenue groupを読み順が崩れない2列へ圧縮する。Mobileは直近数group＋「全N会場を見る」の段階開示、または会場数・公演数summaryから展開する。selected/nextに新しいhighlightを足さず、overview側の初期量を減らす。
- **PR前:** Issue #346のcomposition対象なので修正推奨。

### [P3] 長いlive descriptionで「この公演」のfirst-viewport着地が崩れ得る

- **Finding:** `live.description`を無制限に「この公演」の前へ表示する。
- **visual / composition上の根拠:** 現fixtureではこの公演がDesktop約y280、Mobile約y320で初期viewport内にあり合格。ただし長文descriptionではprimaryが下へ押し出される。
- **Issue #346 / DESIGN.md上の根拠:** AC「有効contextでは選択日の公演を詳細の先頭」、Goalの再探索防止。現在値の違反ではなくedge-case hardening。
- **対象箇所:** `components/lives/LiveDetail.tsx:561-589`。
- **Issue #346の範囲内か:** 範囲内。
- **推奨対応:** 有効context時だけdescriptionを「この公演」の後へ置くか、先頭では短いsummaryへ制約する。live名とGroupBadgeは上に維持する。
- **PR前:** blockerではない。

## Independent Review Integration

- **一致:** 方向性採用、P0/P1なし、setlist empty P2、primary/secondary hierarchy、Meaningful Color / Group Ownership / Earned Lift / One Edge準拠、Mobile wrap、重複status UIなし。
- **意見差:** Aはoverviewを「後段・borderless・small textなので合格」と評価。Bは703pxの縦占有とDesktop単列余白をP2と評価。
- **統合判断:** 初期視線順とsurface stylingは合格。ただし「overviewとして静かに把握」というIssue固有の目的には、全件単列の量がまだ過剰なためP2として残す。

## Cognitive Load

ユーザーは戻りcopyで元の日付を認識し、live titleで対象liveを確認した後、「この公演」で日付・時刻・地域・会場を一度に再認できる。selected performanceを一覧から探すworking-memory負荷は解消された。

負荷が残るのは、empty setlistの意味推測と、大規模tour overviewのスクロール量である。どちらも選択肢の多さではなく、情報密度の状態依存が原因。

## Emotional Journey

- **着地:** 元の日付へ戻れる安心感があり、選んだ公演がすぐ見つかる。
- **この公演:** accentで騒がず、日時・地域・会場が落ち着いて読める。
- **次の公演:** ツアーの連続性を短く感じられる。
- **overview:** 全体像は得られるが、Mobileでは長い一覧へ変わり、発見の余韻より管理表の読書感が少し勝つ。

## Scope-out Supplements

- AttendanceControl内部、nested attendance surface、未登録/編集/保存/error状態はIssue #347。
- Mobileの出演メンバー見出しと人数countのwrapは既存members section由来で、Issue #346外のpolish候補。
- fallback直接訪問UIの再設計、Calendar、Top Daily Story、全アプリpolishは対象外。

## Visual Reference Translation

### 十分翻訳できている

- referenceの「戻り → 選択公演 → 次 → 全体」のcomposition。
- pink accentを模倣せず、neutral edge強度とcontent densityへ変換。
- referenceの複数next cardを、Decisionどおり確定した次の1公演へ収束。
- overviewをcard gridでなくflat listへ変換。
- 日付status badgeを増やさず、copyと位置でcontextを説明。

### 十分でない

- referenceではprimary内に空の情報moduleがなかったが、現行はempty setlist rowが残る。
- referenceのoverviewは短い要約surfaceだったのに対し、現行は全ツアー日程のexhaustive listで量的に大きい。
- pink accent不採用は未翻訳ではなく、Meaningful Color / Group Ownershipへ適合させた正しい翻訳。

## Verification Notes

- Current HEAD: `6b5d2fe`。
- Desktop 1440px / Mobile 390px実画面、valid date+performance context、return navigationを確認。
- long live name / venue wrap、390px横overflowなしを確認。
- Impeccable detector: 対象3 TSXで0 findings。
- `pnpm typecheck`、`pnpm lint`、`git diff --check main...HEAD`成功。
- code/UI/PRODUCT/DESIGNは変更していない。
