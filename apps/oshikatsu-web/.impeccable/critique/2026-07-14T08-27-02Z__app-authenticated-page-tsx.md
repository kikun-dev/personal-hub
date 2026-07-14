---
target: "Issue #344 Daily Storyトップページ（PR #350）"
total_score: 28
p0_count: 0
p1_count: 1
timestamp: 2026-07-14T08-27-02Z
slug: app-authenticated-page-tsx
---
Method: dual-agent (A: daily_story_design_review · B: daily_story_detector_browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | 展開状態は明示されるが、Next Eventsの空状態がデータ取得範囲と一致しない場合がある。 |
| 2 | Match System / Real World | 4/4 | 「今日」「次」「最近」「カレンダー」の時間軸が自然。 |
| 3 | User Control and Freedom | 3/4 | 4件以上の展開・折りたたみは明快。Next Eventsの「すべて見る」は期待した行先ではない。 |
| 4 | Consistency and Standards | 3/4 | 同一イベント行とBadge語彙は一貫するが、一覧順の規則が種別横断で不明確。 |
| 5 | Error Prevention | 3/4 | 件数制限と残数表示は安全。イベント取得期間の差が誤解を生み得る。 |
| 6 | Recognition Rather Than Recall | 3/4 | セクション名で役割を認識できる。MobileのNext Eventsは反復情報が多い。 |
| 7 | Flexibility and Efficiency | 2/4 | 「すべて見る」から未来イベント一覧へ直接進めない。 |
| 8 | Aesthetic and Minimalist Design | 3/4 | 静かな構成だが、MobileではNext Events 4件の視覚量がTodayを上回る。 |
| 9 | Error Recovery | 2/4 | 読み取り画面として空状態はあるが、誤った空状態からの回復説明はない。 |
| 10 | Help and Documentation | 2/4 | 通常利用には十分だが、「すべて見る」の結果をラベルから予測しにくい。 |
| **Total** |  | **28/40** | **Good — 骨格は成立。Next Eventsの信頼性とMobile階層を調整したい。** |

## Anti-Patterns Verdict

**LLM assessment:** AI slopは認めない。巨大Hero、詩的コピー、装飾アニメーション、ガラス表現、過剰角丸、境界線と広い影の併用はない。通常の情報面は境界線だけで定義され、One Edge Ruleに準拠する。Next Eventsは外側コンテナ内のフラットな行、Recent Attendanceは独立した行カードであり、カード内カードにもなっていない。

**Deterministic scan:** 対象6 TSXに対するImpeccable detectorは0 findings。detectorでは、Mobileでの相対的な視覚重量、「すべて見る」の意味、イベント種別ごとの取得期間差は判定できない。

## Overall Impression

PR #350は、「今日」を巨大な日付ではなく、ページ先頭・通常のh1・今日の予定という順序で主役にする判断を正しく実装している。特定の1件をHero化せず、Recent AttendanceとNext Eventsも明確に別の時間軸として読める。最大の機会は、Next Eventsを“未来を信頼して見られる補助情報”として完成させることにある。

## What's Working

1. **Today-firstが構造で成立している。** Desktop/Mobileとも「今日のSakalog」→日付→今日の予定で開始し、日付は14pxの補助情報に留まる。
2. **イベントを恣意的にHero化していない。** TodayScheduleは全種別で同じEventListItemを使い、4件以上でも同じ一覧を先頭3件＋残数トグルとして扱う。
3. **過去・未来の役割分離が明快。** Next Eventsは未来、Recent Attendanceは本人の過去履歴として見出し・表示形式・導線が分かれ、参加登録CTAも追加されていない。
4. **静かなDesign Systemを維持している。** 意味のあるBadge色、小さな角丸、影なし、限定的な境界線で「楽しくても騒がしくしない」を守る。

## Priority Issues

### [P1] Next Eventsが種別によって未来の探索期間を変え、誤った空状態を作り得る

- **根拠:** ライブ・リリース・動画は全取得結果から未来を抽出する一方、カスタムイベント・誕生日は当月と翌月だけを取得する。2か月より先にカスタムイベントまたは誕生日だけが存在する場合、「今後の予定はありません」と表示できる。
- **対象箇所:** `usecases/getTopPageContent.ts`のNext Events構築。
- **Issue #344の範囲内か:** 範囲内。Next Eventsの直近4件と混在種別は本Issueの中核。
- **推奨対応:** 全イベント種別で同じ探索期間または「直近4件が見つかるまで」の取得契約に揃える。性能上難しければ、少なくとも空状態を断定表現にしない。
- **Suggested command:** `$impeccable harden`

### [P2] 「すべて見る」が未来イベント一覧ではなく現在月のカレンダーへ移動する

- **根拠:** ラベルはNext Eventsの全件表示を予告するが、`href="#calendar"`は日付探索領域へスクロールするだけで、翌月以降を含む未来イベント一覧を表示しない。
- **対象箇所:** `components/top/NextEvents.tsx`の「すべて見る」。
- **Issue #344の範囲内か:** 範囲内。ACがNext Eventsの全件導線を求めている。
- **推奨対応:** 実際の未来一覧へ接続する。現状カレンダーを行先に維持するなら、ラベルを「カレンダーで探す」など実挙動へ合わせ、ACとのDecisionを更新する。
- **Suggested command:** `$impeccable clarify`

### [P2] MobileではNext Eventsの視覚量がTodayを上回る

- **根拠:** 390pxの実画面で、Today 1件は短い1行なのに対し、Next Events 4件は約346pxを占める。日付、Badge、名称、補足、「あとN日」の反復により、ページ先頭のTodayより未来ブロックが強く残る。
- **対象箇所:** `components/top/NextEvents.tsx`、`app/(authenticated)/page.tsx`のMobile配置。
- **Issue #344の範囲内か:** 範囲内。Mobileの情報順とDaily Story階層に直接関係する。
- **推奨対応:** Mobileだけ表示密度を下げる。日付単位のグルーピング、同日ラベルの重複削減、補足の優先順位整理などで、件数を恣意的にHero化せず高さを抑える。
- **Suggested command:** `$impeccable distill`

### [P2] 4件以上の初期3件が集約順に依存し、混在種別を暗黙に偏らせる

- **根拠:** `todayEvents`はカスタム/誕生日の配列へライブ、動画、リリースを順番に追加し、最終的な種別横断sortを行わない。その先頭3件を折りたたみ表示するため、時刻やユーザー上の重要度ではなく実装の集約順が初期露出を決める。
- **対象箇所:** `usecases/getTopPageContent.ts`のtodayEvents構築、`TodaySchedule.tsx`の`slice(0, 3)`。
- **Issue #344の範囲内か:** 範囲内。4件以上・混在種別・恣意的な主役化を扱うACに関係する。
- **推奨対応:** 種別横断の安定した並び規則をDecisionとして明示する。時刻付き予定を時刻順、終日情報を別の一貫した位置へ置き、同値時のtie-breakerも固定する。
- **Suggested command:** `$impeccable shape`

### [P2] 新規の空状態・補助情報が低コントラストで、0件体験が視覚的に消える

- **根拠:** Today/Nextの空状態は`text-foreground/40`。白地の`#171717`を40%合成すると約2.55:1で、14px本文の4.5:1を満たさない。`/50`の「すべて見る」、日付、「あとN日」も約3.41:1。
- **対象箇所:** `TodaySchedule.tsx`、`NextEvents.tsx`。
- **Issue #344の範囲内か:** 範囲内。今回追加した0件状態とNext Events情報。
- **推奨対応:** 空状態は最低でもAAを満たす本文色へ上げる。日付・日数・リンクも情報として読ませるなら同様に上げ、階層はサイズ・配置・ウェイトで作る。
- **Suggested command:** `$impeccable audit`

## Cognitive Load

Desktopはmainとrailの分離が自然で、最初の視線はh1へ入りやすい。MobileもDOM順は正しいが、Next Eventsの各行が日付・種別・名称・時刻・会場・残日数を同時提示し、4件で5つの操作候補（4件＋すべて見る）になる。Recent Attendanceは見出しとカード形式が異なるため、未来情報との混同は起きにくい。全体として認知負荷は中程度で、主な負荷源はMobile Next Eventsの反復である。

## Emotional Journey

- **到着:** 「今日のSakalog」と日付で静かに現在地が分かる。
- **今日の予定あり:** 意味色のBadgeが小さな楽しさを与え、1件だけを誇張しない。
- **今日0件:** 構造上は直後のNext/Recentへ続くため体験は途切れない。ただし空状態が薄すぎ、意図した橋渡しより“情報が消えた”印象になり得る。
- **未来:** Next Eventsで期待が生まれるが、Mobileでは長さが勝って今日の余韻を奪う。
- **過去:** Recent AttendanceはCTAではなく記録として現れ、静かな振り返りで終えられる。

## Persona Red Flags

**Sam（低視力・キーボード利用）:** `/40`・`/50`の新規テキストが読みにくい。「すべて見る」の見た目と行先の意味も一致しない。

**Riley（境界状態を検証）:** 2か月より先のカスタムイベント/誕生日だけを登録すると、実在する予定と「今後の予定はありません」が矛盾する。4件以上の混在時は集約順が先頭3件を左右する。

**Casey（Mobileで短時間閲覧）:** Todayはすぐ把握できるが、Next Events 4件の長いブロックを越えないと最近の参加記録へ届かない。同日イベントでも日付と「あとN日」が反復される。

## Scope-out Supplements

- Past Same-Dayが未実装であることは#345の範囲であり、PR #350のFindingにしない。
- 日付contextのライブ詳細継承は#346の範囲であり、今回修正しない。
- カレンダーのsemantic model、Mobile interaction、event dot、広範なtheme/state hardeningは#344のNon-goalであり、補足に留める。

## Questions to Consider

- Next Eventsの「すべて」は、未来予定の一覧を意味するのか、日付探索へ戻ることを意味するのか。
- MobileでTodayが1件のときも、未来4件をすべて初期表示することがDaily Storyの優先順位に合うか。
- 4件以上の先頭3件は、データ集約順ではなく何をもって“自然な順”と定義するか。
