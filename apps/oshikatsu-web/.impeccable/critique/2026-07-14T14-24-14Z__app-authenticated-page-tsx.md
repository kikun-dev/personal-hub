---
target: "Issue #345 Past Same-DayとCalendar接続 再レビュー（HEAD 99377f6）"
total_score: 35
p0_count: 0
p1_count: 0
timestamp: 2026-07-14T14-24-14Z
slug: app-authenticated-page-tsx
---
Method: single-agent (current diff + responsive DOM/class inspection + prior snapshot delta; authenticated browser unavailable)

## Design Health Score

| # | Heuristic | Score | Key observation |
|---|---|---:|---|
| 1 | Visibility of System Status | 4/4 | 選択日をページ先頭の見出し・予定・Pastへ一貫して反映する。 |
| 2 | Match System / Real World | 4/4 | N年前、暦年、出来事の順で時間の蓄積を読める。 |
| 3 | User Control and Freedom | 3/4 | 今日へ戻る導線はあるが、展開状態が日付間で残る可能性がある。 |
| 4 | Consistency and Standards | 4/4 | 既存の文字、余白、EventListItemを再利用している。 |
| 5 | Error Prevention | 3/4 | Calendar遷移時のclient state resetが明示されていない。 |
| 6 | Recognition Rather Than Recall | 4/4 | 今日/選択日、Past/Next/Recentの役割を見出しで識別できる。 |
| 7 | Flexibility and Efficiency | 4/4 | 3年group単位の段階開示で多件時の縦長化を抑える。 |
| 8 | Aesthetic and Minimalist Design | 3/4 | 1年1件にも外枠とtimeline dotを固定適用し、少数時には構造がやや勝つ。 |
| 9 | Error Recovery | 3/4 | 選択日から今日へ戻る明示リンクがある。 |
| 10 | Help and Documentation | 3/4 | ラベルは自己説明的だが「さらにN年」の単位は年group数と少し曖昧。 |
| **Total** |  | **35/40** | **Good — 基本構造と多件対応は成立。状態リセットと単件時の軽さを確認したい。** |

## Anti-Patterns Verdict

出来事ごとの同型カード反復、巨大な日付Hero、過剰な色、広い影はない。Pastの外枠はborderのみでshadowを持たず、One Edge Ruleには違反しない。timeline railも1px線と小さなdotに限定され、AI slopの強い兆候はない。

ただし、単件時にも外枠・dot・3列gridを固定適用するため、「年の蓄積を示す構造」がまだ存在しない状態でもtimeline chromeが先行する。違反ではないが、Issue #345の「1年・1件を過剰なカード表現にしない」との境界にある。

## What's Working

1. `VISIBLE_YEAR_GROUPS = 3`と年group単位の展開により、履歴が育ってもNext/Recent/Calendarを無制限に押し下げない。
2. Mapで年別集約してから年降順へ並べるため、同一年が入力順によって分裂しない。
3. Calendar選択後、ページ先頭の見出し、日次予定、Past Same-Dayが同じ選択日へ揃う。Calendar下に重複していたEventListもなくなった。
4. 選択日は20pxの通常Headlineで、巨大な日付Heroにはなっていない。「今日へ戻る」も控えめなtext linkである。
5. DesktopはPast 1.5fr / Recent 1fr、Mobile DOM順はPast → Next → Recent → Calendarを維持する。
6. Pastは共有履歴を年軸で、Recentは本人の参加履歴を記録itemで示し、情報の意味は区別できる。

## Priority Issues

### [P2] Calendarで日付を変えても展開状態が残り、別日の初期表示が3年に戻らない可能性がある

- **根拠:** `PastSameDay`と`DaySchedule`はcomponent内の`useState`で展開状態を保持する。ページ側で選択日をkeyにしておらず、同じcomponent位置へ新しいpropsが渡るため、Next.jsのquery navigationでclient stateが再利用され得る。ある日を展開した後、別日に移動すると、その日も最初から全件表示になる可能性がある。
- **対象箇所:** `components/top/PastSameDay.tsx:45-53`、`components/top/DaySchedule.tsx:20`、`app/(authenticated)/page.tsx:89-108`。
- **Issue #345の範囲内か:** 範囲内。Calendarと選択日Daily Storyの接続、多件状態の一貫性に関係する。
- **推奨対応:** 選択日をcomponentの`key`へ含めるか、date identityをpropとして受けて変更時に折りたたみへ戻す。PastとDayScheduleの両方で同じ方針にする。
- **Suggested command:** `$impeccable harden`

### [P2] 1年・1件でも外枠とtimeline chromeが固定され、単件状態としてはやや重い

- **根拠:** 1件でも`rounded-lg border p-4`、年列、dot列、event列の3列構造になる。出来事ごとのカード反復ではないものの、蓄積がまだない状態ではdotに接続先がなく、外枠もRecent Attendanceのborder itemと形状語彙が近づく。
- **対象箇所:** `components/top/PastSameDay.tsx:61-88`。
- **Issue #345の範囲内か:** 範囲内。1年・1件のAcceptance CriteriaとPast/Recentの役割区別に直接関係する。
- **推奨対応:** 単一year groupでは年ラベル＋出来事のフラットな2層を基本にし、rail線は複数年で初めて出す。外枠を残す場合でも単件ではdotを省き、timelineの装飾より内容を先に読む形にする。出来事カードは追加しない。
- **Suggested command:** `$impeccable distill`

### [P3] 「さらにN年を見る」が年group数なのか期間なのか曖昧

- **根拠:** `restYearCount`は非連続でもhidden year groupの件数を数える。例えば2018年と2015年が残る場合の「さらに2年を見る」は、2年間の範囲とも読める。
- **対象箇所:** `components/top/PastSameDay.tsx:49-53,99`。
- **Issue #345の範囲内か:** 範囲内だが軽微なcopy調整。
- **推奨対応:** 「残り2年分を見る」または「過去2年分を表示」のように、年group数であることを明示する。
- **Suggested command:** `$impeccable clarify`

## Cognitive Load

選択日をCalendar下の重複一覧ではなくページ先頭の日次予定へ統合したことで、どの領域を見ればよいかは明確になった。Pastも「N年前 → 年 → 出来事」でスキャンでき、3年単位の段階開示により多件時の初期負荷は低い。

一方、単件時は外枠、年列、dot列、イベント種別Badgeが同時に現れる。情報量そのものは少ないため、複数年用のtimeline構造が相対的に目立ちやすい。

## Emotional Journey

- **今日:** 日次予定からPast、Nextへ静かに続き、Calendarが主役へ戻らない。
- **別日:** 「選んだ日のSakalog」と「今日へ戻る」により、一時的な日付探索であることを把握できる。
- **予定なし:** 小さなempty messageの後にPast、Next、Recentが続く構造を維持する。
- **蓄積時:** N年前を主ラベルとするtimelineと段階開示により、長い履歴を“長いページ”ではなく“振り返れる蓄積”として扱いやすくなった。

## Scope-out Supplements

- CalendarのARIA grid、event dotの意味、Mobile操作モデルはCF-002 / CF-003として分離する。
- 選択日からライブ詳細へのperformance context、戻り導線はContextual Live Detail / Issue #346の範囲。
- Calendar選択後のfocus announcementやscroll semanticsは関連するが、今回の修正要求には含めない。

## Verification Notes

- Current HEAD: `99377f6`。
- Impeccable detector: 対象3 TSXで0 findings。
- `pnpm typecheck`、`pnpm lint`、差分の`git diff --check`は成功。
- Responsive構造はclass/DOMで確認: Desktop `1.5fr / 1fr`、Mobile Past → Next → Recent → Calendar。
- 保存済みPlaywright認証が失効し、現在のHEADは`/login`へredirectされた。このため1440px / 390pxの現行visual、同一年複数件、4年group以上の展開操作は動的確認できていない。
- 直前HEADでは今日、予定なし、Past 1件、複数年を1440px / 390pxで確認済み。今回の評価ではその証拠とcurrent diffを分離して扱い、現行visualを確認済みとはしていない。
