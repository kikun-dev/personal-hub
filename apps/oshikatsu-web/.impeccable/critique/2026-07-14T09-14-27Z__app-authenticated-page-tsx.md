---
target: "Issue #344 情報階層・余白・Next Events rail"
total_score: 31
p0_count: 0
p1_count: 0
timestamp: 2026-07-14T09-14-27Z
slug: app-authenticated-page-tsx
---
Method: dual-agent (A: hierarchy_quick_review · B: hierarchy_spacing_evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 4/4 | 見出しと時間軸は明瞭。 |
| 2 | Match System / Real World | 4/4 | 今日・次・最近の時間順が自然。 |
| 3 | User Control and Freedom | 3/4 | 展開・折りたたみは明快。 |
| 4 | Consistency and Standards | 3/4 | 一貫性は高いが、共用行がToday固有の階層を弱める。 |
| 5 | Error Prevention | 3/4 | 今回の狭いスコープでは大きな問題なし。 |
| 6 | Recognition Rather Than Recall | 3/4 | railのインライン折返しで主情報と補助情報の再認が弱い。 |
| 7 | Flexibility and Efficiency | 3/4 | Desktop/Mobile双方で情報は欠落しない。 |
| 8 | Aesthetic and Minimalist Design | 3/4 | 静かだが、余白の一律性とMobileの外枠が主従を弱める。 |
| 9 | Error Recovery | 2/4 | 今回の閲覧面では評価対象が限定的。 |
| 10 | Help and Documentation | 3/4 | セクション名だけで役割を理解できる。 |
| **Total** |  | **31/40** | **Good — 構造は正しく、タイポグラフィと余白の調律段階。** |

## Anti-Patterns Verdict

AI slopは認めない。巨大Hero、追加カード、装飾的な影、過剰角丸、グラデーション、目的のない色は不要であり、現状にも存在しない。One Edge Ruleは守られている。改善は新しい面を足すのではなく、proximity、主行/補助行、responsiveな境界の扱いで行うべきである。

Detectorのlayout findingsは0件。任意値spacing/z-indexも0件だった。検出器では、一律の32pxが意味上適切か、222px railでインライン情報が読みやすいかは判断できない。

## Overall Impression

Issue #344の情報順は正しい。「今日の予定」が平坦なのは強調不足ではなく、「今日のSakalog + 日付」と予定が別のpeer sectionとして32px離れ、予定行も通常一覧と同じ14pxインライン構造だからである。

Next Eventsは日付グルーピングと「カレンダーで探す」への修正で以前より明確になった。それでもDesktop railの実効222pxへBadge、名称、時刻、公演数、会場を同じinline flowで置くため、4行中3行が2行へ折り返し、読み順が安定しない。

## What's Working

1. Today → Next Events → Recent Attendance → Calendarの情報順はDesktop/Mobileとも自然。
2. セクション間32px、見出しと内容12pxという基本リズムは一貫し、横overflowもない。
3. Next Eventsの日付グルーピングにより、同日の反復はすでに解消されている。
4. 色は種別識別に限定され、参加CTAや装飾的な面を増やしていない。

## Priority Issues

### [P2] Daily headerとToday Scheduleが同じ32px間隔で分断され、「今日」のまとまりが弱い

- **根拠:** mainの`space-y-8`が、ページ見出し→Today、Today→Next/Recent、Recent→Calendarのすべてへ同じ32pxを適用している。現行データではToday section全体が52px、予定内容は20pxの1行だけで、先頭配置以外のまとまりが弱い。
- **対象箇所:** `app/(authenticated)/page.tsx`のmain stackとToday section。
- **Issue #344の範囲内か:** 範囲内。Today-firstの情報階層そのもの。
- **推奨対応:** 「今日のSakalog + 日付」と「今日の予定」を一つのsemantic groupへまとめ、両者の間を20〜24px程度へ縮める。そのgroupの後は32px以上を維持し、現在から未来/過去へ移る境界を余白で示す。背景、外枠、Heroは追加しない。
- **Suggested command:** `$impeccable layout`

### [P2] Todayが通常EventListItemの一行表示を共有し、主行と補助行を作れない

- **根拠:** TodayScheduleは通常のEventListと同じEventListItemをそのまま使う。単件時はBadge、名称、年齢、所属が14px中心の一行へ並び、広いmain columnに対して情報が横へ流れるだけになる。
- **対象箇所:** `components/top/TodaySchedule.tsx`、`components/events/EventListItem.tsx`。
- **Issue #344の範囲内か:** 範囲内。全イベント一覧の再設計は範囲外。
- **推奨対応:** 分岐・リンク生成は共有しつつ、Today用の表示variantを持つ。名称を14px mediumの主行、時刻・会場・年齢・所属を12pxの補助行へ分け、行に上下4px程度の呼吸を与える。複数件は`divide-y`相当の細い区切りか行間だけで分ける。カード化しない。
- **Suggested command:** `$impeccable typeset`

### [P2] Desktop railは実効222pxに対してイベント情報が同じinline flowへ詰め込まれている

- **根拠:** rail外幅256pxからborderと16px paddingを引くと実効幅は約222px。現在の4イベントは41/41/21/41pxで、3件が2行へ折り返す。Badge、名称、時刻、公演数、会場の境界が折返し位置へ依存する。
- **対象箇所:** `app/(authenticated)/page.tsx`の16rem rail、`components/top/NextEvents.tsx`の各event row。
- **Issue #344の範囲内か:** 範囲内。Desktop support railの可読性。
- **推奨対応:** 日付groupは維持し、各イベントを「Badge + 名称」の主行と「時刻・公演数・会場」の補助行へ分ける。group間を12〜16px、同日event間を8〜10px程度にし、横幅拡大より先に行構造を直す。新しいevent cardは作らない。
- **Suggested command:** `$impeccable distill`

### [P2] MobileにもDesktop rail用の外枠とpaddingが残り、Next Eventsの面がTodayより強い

- **根拠:** MobileのNext Eventsは外幅358px、実効324px、高さ274px。overflowはないが、52pxのTodayに対して単一の境界付き面が大きく見える。読みやすさはDesktopより良いものの、Daily Storyの主従では未来側が強い。
- **対象箇所:** `components/top/NextEvents.tsx`の共通outer container、`page.tsx`のMobile配置。
- **Issue #344の範囲内か:** 範囲内。Mobileの情報階層。
- **推奨対応:** Mobileでは通常sectionとして外枠と16px paddingを外し、見出し＋日付group＋区切り付きlistにする。Desktopだけrailの単一境界を維持してよい。responsive compositionを変えても情報と機能は削らない。
- **Suggested command:** `$impeccable adapt`

## Cognitive Load

選択肢数は4件程度で過剰ではない。負荷源はイベントごとの情報量ではなく、主情報と補助情報が同じinline flowへ入り、折返し後の読み始めが揃わないことにある。一方Todayは情報が少なすぎるのではなく、名称と補足が同じ行に並ぶため入口として認識しにくい。解決は情報追加ではなく、Todayの主行強化とNext Eventsの段階化である。

## Emotional Journey

- **到着:** 静かで整っており、今日の日付はすぐ分かる。
- **Today:** 単件時は確認が速い反面、内容が汎用一覧の一部に見え、日次の小さな発見としての手応えが弱い。
- **Next Events:** 未来への期待はあるが、Desktopでは折返しの多さ、Mobileでは大きな境界面が視線を長く占有する。
- **Recent Attendance:** 独立カードで思い出の領域だと理解できる。Next Eventsとの役割混同はない。

## Scope-out Supplements

- Next Eventsの探索契約、並び規則、AAコントラスト、「カレンダーで探す」、日付グルーピングはcommit `725f768`で対応済み。今回のFindingとして再掲しない。
- Past Same-Day、Calendar semantics、ライブ詳細contextは今回の狭いレビュー範囲外。

## Evidence Limitations

- 現行データはToday 1件、Next Events 4件・2日group、Recent Attendance 3件。
- Today 4件以上の展開、0件、極端に長い非改行文字列は今回再現していない。
- 390px Chromiumで確認し、WebKit固有差は未検証。
