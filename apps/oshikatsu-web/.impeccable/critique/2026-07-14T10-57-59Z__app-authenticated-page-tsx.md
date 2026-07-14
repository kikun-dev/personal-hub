---
target: "Issue #345 Past Same-DayとCalendar接続"
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-07-14T10-57-59Z
slug: app-authenticated-page-tsx
---
Method: dual-agent (A: past_same_day_quick · B: past_same_day_evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 4/4 | 今日/選択日の見出し追従が明快。 |
| 2 | Match System / Real World | 4/4 | 年→N年前→出来事の時間表現が自然。 |
| 3 | User Control and Freedom | 3/4 | 多年時の段階開示がない。 |
| 4 | Consistency and Standards | 4/4 | 既存EventListItemと余白語彙を再利用。 |
| 5 | Error Prevention | 3/4 | year groupingが入力順契約へ依存する。 |
| 6 | Recognition Rather Than Recall | 4/4 | Past/Recent/Nextの時間方向を見出しと形で識別できる。 |
| 7 | Flexibility and Efficiency | 3/4 | 多件時に後続セクションが遠ざかる。 |
| 8 | Aesthetic and Minimalist Design | 4/4 | カード反復なし。年group dividerだけで整理。 |
| 9 | Error Recovery | 2/4 | 閲覧中心のため評価対象が限定的。 |
| 10 | Help and Documentation | 3/4 | 「過去の今日」「過去のM月D日」で十分に自己説明的。 |
| **Total** |  | **34/40** | **Good — 主要構造は成立。多件時の長さと未再現状態を確認したい。** |

## Anti-Patterns Verdict

AI slopは認めない。Past Same-Dayは年ごとの外枠カード、タイムラインの装飾線・dot、巨大な年号、過剰な色を使わず、年見出しとdividerで蓄積を表現している。出来事ごとの同型カード反復にも戻っていない。

One Edge Ruleにも準拠する。Pastは影・外枠なしで年group間の1px dividerだけ、Recent Attendanceは8px角丸・borderのみ・shadowなしであり、両者の役割差が形に反映されている。

Impeccable detectorは対象TSX 2件で0 findings。

## Overall Impression

Issue #345の目的は達成されている。年見出し、「N年前」、同一年の出来事をまとめるulにより、履歴が“イベントカードの集合”ではなく“年の蓄積”として読める。

DesktopではPast 412.8px、Recent 275.2pxの1.5:1で同じ上端に揃い、Pastをやや広く扱うDecisionに一致する。Mobileの可視順もToday → Past → Next → Recent → Calendarで正しい。Calendarは「日付から探す」として後段にあり、ページの主役へ戻っていない。

## What's Working

1. **年の蓄積が自然。** 年、N年前、出来事の3層で、新しい年から古い年へ読める。
2. **カード反復を回避。** 年group間のdividerとgroup内listだけで、1件でも過剰な面にならない。
3. **PastとRecentが明確に別物。** Pastは共有アーカイブの年表、Recentは本人の参加日・参加種別を持つ枠付き記録。
4. **responsive順序がDecisionどおり。** Desktopは横並び、MobileはPastをNext/Recentより前へ置く。
5. **予定なしでも継続。** 7/1の確認ではPastと選択日の予定が空でも、Next/Recentを経てCalendarへ続く。

## Priority Issues

### [P2] 多年・多件時にPast Same-Dayが後続のNext/Recent/Calendarを無制限に押し下げる

- **根拠:** PastSameDayは全year groupと全eventを初期表示し、上限・折りたたみを持たない。390pxではPast空のCalendarがy=942、3年3件でy=1146まで下がった。将来10年・20年へ育つと影響が線形に増える。
- **対象箇所:** `components/top/PastSameDay.tsx`の全group描画、`app/(authenticated)/page.tsx`のMobile順。
- **Issue #345の範囲内か:** 範囲内。ACの「件数が多い状態」とProduct Principle「思い出が育つほど楽しくする」に関係する。
- **推奨対応:** 年group単位で直近3〜5年を初期表示し、「さらにN年を見る」で段階開示する。年groupの途中では切らず、単件・少数年ではトグルを出さない。カード追加は不要。
- **Suggested command:** `$impeccable distill`

### [P3] 同一年複数件の年group内関係はコード上成立するが、実データで視覚確認できていない

- **根拠:** groupByYearは同一年を同じulへまとめ、`space-y-2.5`で複数eventを並べる。一方、今回の実データでは同一年複数件を再現できず、折返し、Badge反復、event間の分離感を確認できなかった。
- **対象箇所:** `components/top/PastSameDay.tsx:55-60`。
- **Issue #345の範囲内か:** 範囲内。明示的なAcceptance Criteria。
- **推奨対応:** 一時fixtureまたは検証データで、同一年2〜3件と長い名称の390px/1440px screenshotを残す。必要ならevent listを12〜16pxだけindentし、年見出しとの親子関係を強める。個別border/cardは追加しない。
- **Suggested command:** `$impeccable adapt`

### [P3] year-group componentが「同一年は連続済み」という入力順契約へ依存する

- **根拠:** groupByYearは直前groupと年が同じ場合だけまとめる。現状はusecaseの日付降順sortで成立するが、将来並び規則が変わると同じ年が複数groupへ分裂し、年の蓄積表現が壊れる。
- **対象箇所:** `components/top/PastSameDay.tsx:11-24`、`usecases/getTopPageContent.ts`のonThisDay sort。
- **Issue #345の範囲内か:** 範囲内のhardening。ただし現時点の表示バグではない。
- **推奨対応:** sorted contractをprop/型へ明示するか、group側でyear Map化後に年降順sortする。UI変更は不要。
- **Suggested command:** `$impeccable harden`

## Cognitive Load

「過去の今日」→「2018年・8年前」→出来事という3層が自然で、ユーザーは年をアンカーにスキャンできる。同一年の出来事で年見出しを反復しないため、件数が増えてもカード一覧より負荷が低い。

Past、Next、Recentはそれぞれ共有アーカイブの過去、未来予定、本人の過去という異なる時間方向を持つが、見出しと表示形式が異なるため混同しにくい。主な将来負荷は選択肢数ではなく、全履歴を一度に展開した際の縦距離である。

## Emotional Journey

- **今日:** Pastが空でも「まだありません」と静かに伝え、Next/Recentへ続く。
- **1件:** 年とN年前が出来事へ時間的な親密さを加え、過剰演出なしで小さな発見になる。
- **複数年:** 年ごとのdividerがアーカイブの成長を感じさせる。
- **多件:** 蓄積自体は嬉しいが、無制限表示では“育った記録”が“長いページ”へ転じる可能性がある。

## Scope-out Supplements

- CalendarのARIA grid、event dot、Mobile interaction modelはCF-002/CF-003として分離する。
- Calendar選択後のscroll/focus feedbackや選択日結果の位置設計はCF-002/CF-003と接続するため、今回の修正要求に含めない。
- ライブ詳細への日付/performance context継承はIssue #346の範囲。

## Evidence Limitations

- 実画面確認: Today/Past空、別日Past 1件、複数年2件、3年3件、予定なし。
- 同一年複数件と4件超Pastは実データで再現できず、コード構造をfallbackにした。
- Chromium 1440px/390pxのみ。WebKit、dark mode、keyboard、screen readerは未確認。
