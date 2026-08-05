---
target: Sakalogのメンバー閲覧フロー（一覧→詳細→関連情報→楽曲・リリース・ライブ）
total_score: 27
p0_count: 0
p1_count: 3
timestamp: 2026-08-04T06-50-22Z
slug: app-authenticated-members-page-tsx
---
Method: dual-agent (A: /root/member_critique_a · B: /root/member_critique_b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | 絞り込み件数は見えるが、関連探索の人物文脈は残らない。 |
| 2 | Match System / Real World | 4/4 | 参加楽曲・選抜ポジション・グループ履歴の語彙が自然。 |
| 3 | User Control and Freedom | 3/4 | 一覧復帰は良いが、人物起点の関連探索から戻れない。 |
| 4 | Consistency and Standards | 3/4 | Card/Badgeは一貫、PendingLinkと素の操作が混在。 |
| 5 | Error Prevention | 3/4 | フィルタは制約されるが、検索不能で大量走査になる。 |
| 6 | Recognition Rather Than Recall | 2/4 | 92人の認知走査と複数画面の関係記憶が必要。 |
| 7 | Flexibility and Efficiency | 2/4 | 既知人物・関連記録へ直接到達する経路がない。 |
| 8 | Aesthetic and Minimalist Design | 3/4 | 静かだがDesktop詳細のカード幅が広すぎる。 |
| 9 | Error Recovery | 2/4 | 空結果からの明示的なfilter resetがない。 |
| 10 | Help and Documentation | 2/4 | 人物ページで何をたどれるかが画面から学びにくい。 |
| **Total** |  | **27/40** | **Acceptable — 基盤は良いが人物発見と関係探索を改善** |

## Anti-Patterns Verdict

**LLM assessment:** AI slopは認めない。gradient text、glass、巨大角丸、広い影、装飾モーションはなく、静かな個人アーカイブとして信頼できる。一方、同型カードの反復が人物起点の思い出をたどる固有体験を平板にしている。

**Deterministic scan:** メンバー関連route/componentsは0 findings。overlayの`single-font` / `overused-font`は、DESIGN.mdのOne-Family RuleがArial単一familyを要求するためfalse positive。

**Visual overlays:** mutable injectionとdetect.js読込はheadlessのfresh tabで成功。永続的なユーザー可視tabはPlaywright fallbackでは提供できず、live serverは停止済み。

## Overall Impression

静かで信頼できる人物名鑑としては成立する。最大の機会は、一覧を「人を探す」道具へ、詳細を「その人にまつわる記録をたどる」入口へ変えること。

## What's Working

1. 白黒の静かな面にグループ色をBadgeだけで使い、Meaningful Color Ruleを維持している。
2. グループ絞り込みはURLへ保存され、詳細から同じ一覧状態へ戻れる。
3. Mobile詳細のプロフィール・履歴・選抜・参加楽曲は短い縦リズムで読みやすく、document overflowもない。

## Priority Issues

### [P1] 92人の一覧に直接検索がない

- **Why it matters:** 名前や読みを知るユーザーもカードを大量走査する。乃木坂へ絞っても34人で、Mobileの到達距離が長い。
- **Fix:** 名前・かな検索をURL同期で追加し、必要なら五十音/世代アンカー、clear action、件数statusを同じ探索モデルへ入れる。
- **Suggested command:** `$impeccable shape`

### [P1] 人物から関連アーカイブへ進む経路が隠れた二段階で、戻ると人物文脈を失う

- **Why it matters:** 選抜ポジションは非リンク。参加楽曲を展開し、曲詳細へ入って初めてrelease/live関係が現れる。楽曲の可視戻り操作は実際に`/songs`へ移る。
- **Fix:** 人物中心の関連surfaceとorigin contextを定義し、選抜リリース、主な参加曲、披露ライブへ直接進み、人物へ安全に戻れるようにする。
- **Suggested command:** `$impeccable shape`

### [P1] Disclosureと関連リンクが共通interaction contractを外れる

- **Why it matters:** 「全曲を表示」は75.2×16px、既定1px focusで、programmatic expanded stateもない。関連Linkも一覧Cardのfocus/pending契約を継承しない。
- **Fix:** 共通Disclosure/TextAction/RelationshipLinkへ寄せ、hit area、2px focus、`aria-expanded`/`aria-controls`、pendingを保証する。
- **Suggested command:** `$impeccable harden`

### [P2] Desktop詳細の読み幅が広すぎる

- **Why it matters:** compactなプロフィールのラベルと値が約1214px幅のCard内で離れ、視線往復が増える。
- **Fix:** 人物詳細だけreadable measureを制限するか、近接した内部gridを使う。
- **Suggested command:** `$impeccable layout`

### [P3] Headless UI Menuのhydration warningがfresh contextで観測された

- **Why it matters:** productionでも再現する場合は`aria-controls`のid対応を損なう可能性がある。
- **Fix:** production buildのfresh navigationで再現テストし、再現時だけHeadless UI id stabilityを修正する。
- **Suggested command:** `$impeccable harden`

## Cognitive Load

8項目中4項目Fail。Single focus、Grouping、One thing at a time、Progressive disclosureは成立。Chunking、Visual hierarchy、Minimal choices、Working memoryが失敗。主因は92人のカード走査と人物→曲→リリース／ライブのmemory bridge。

## Emotional Journey

一覧到着時は静かで安心でき、人物詳細ではプロフィールやサイリウム、選抜、参加曲が親密に積み上がる。谷は「誰かを探す」と「その人の記録をたどる」の間にある。ライブ詳細まで着けば情報の厚みが報酬になるが、人物の記憶を保持して複数画面を渡る必要がある。

## Persona Red Flags

### Alex — 長期アーカイブを使う管理者

- 既知人物を検索できない。
- 選抜・披露ライブへ二段階以上必要。
- 選抜ポジションがリリースへつながらない。

### Jordan — 招待されたファン

- 画像なしの同型カードを大量走査する。
- 人物詳細から何をたどれるか学びにくい。
- 関連ライブ・イベントが人物詳細に直接現れない。

### Sam — Keyboard/低視力利用者

- Disclosureが16px高で既定1px focus。
- センター文字がlight themeで3.19:1。
- 素のLinkとPendingLinkのfocus/pending品質が一様でない。

## Minor Observations

- 結果件数はDesktopでfilter群から右端へ離れる。
- 外部URLは新規tabを見た目で示さない。
- Mobileカードの主要tap areaと横overflowは良好。
- single-font detector findingはfalse positive。

## Questions to Consider

- 人物ページの成功はプロフィール確認か、その人にまつわる曲・公演・記憶へ到達することか。
- 92人を同じカードで並べるより、検索・五十音・最近見た人物という入口を持つべきか。
- 選抜、参加楽曲、披露回数を静的項目ではなく人物の時間軸として束ねると何が見えるか。
