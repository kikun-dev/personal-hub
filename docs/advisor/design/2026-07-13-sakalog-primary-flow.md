# Sakalog Design Audit

## Scope

### 対象フロー

1. トップページを開く
2. 今日の情報を確認する
3. 月を変更する
4. イベントを見つける
5. イベント詳細を確認する

### Desktop / Mobileの検証条件

- 対象URL: `http://localhost:3001`
- 実施日: 2026-07-13
- Desktop: Chromium、1440 × 1000 CSS px
- Mobile: Chromium、Pixel 7相当、412 × 839 CSS px
- テーマ: ライトテーマ
- 認証: 専用Chromeで手動ログイン後に保存したローカルの `storageState` を再利用
- 確認方法: 現行画面のスクリーンショット、DOM構造、キーボードフォーカスのスポット確認
- 安定撮影条件: `prefers-reduced-motion` を有効化

### 対象外

- Google OAuth画面およびログイン操作そのもの
- UI実装、redesign、コード変更、確定仕様の策定
- ダークテーマ、タブレット、Mobile実機、Chromium以外のブラウザ
- 200%ズーム、実機スクリーンリーダー、通常モーション時のアニメーション品質
- 管理画面および主要閲覧フロー外のページ
- スクリーンショットをGit管理するかどうかの判断

## Product Design Audit

本節は、現行UIを `PRODUCT.md` と `DESIGN.md` に照らして観察した一次監査結果である。各Findingの「改善の方向性」は検討候補であり、確定仕様、実装要件、IssueのDecisionを意味しない。

### Flow Evaluation

| Step | フロー | 評価 | 観察の要約 |
|---|---|---|---|
| 1 | トップページを開く | 概ね良好 | 静かで整理された画面だが、初期表示では月間カレンダーが日次情報より強く見える。 |
| 2 | 今日の情報を確認する | 要改善 | 「今日のイベント」と「今日はなんの日」は存在するが、カレンダーより後にあり、「毎日開く理由」が第一印象になりにくい。 |
| 3 | 月を変更する | 良好 | 前月・翌月・Todayの操作が見つけやすく、月と選択日の状態がURLに保持される。 |
| 4 | イベントを見つける | 要改善 | 日付選択後のイベント一覧は明確だが、選択前の発見は凡例のない色ドットと視覚情報に依存する。 |
| 5 | イベント詳細を確認する | 概ね良好 | ツアー日程と参加状態まで確認できる一方、遷移元の日付へ戻る明示的な導線がない。 |

### Current Strengths

- 前月・翌月・Todayの月操作は画面上で識別しやすく、月変更後の状態がURLへ保持される。根拠: `03-desktop-next-month.png`、`08-mobile-next-month.png`。
- 日付を選択した後は、色だけでなく「誕生日」「ライブ」「リリース」などの種別ラベルとイベント名が表示される。根拠: `04-desktop-event-found.png`、`09-mobile-event-found.png`。
- 選択日の現在イベントと「今日はなんの日」の過去イベントが近くに配置され、同じ日を起点に現在と過去を行き来できる。根拠: `01-desktop-top.png`、`07-mobile-today.png`。
- ライブ詳細ではツアーの全日程と参加状態を確認でき、情報閲覧と個人の参加記録が同じ体験内につながっている。根拠: `05-desktop-event-detail.png`、`10-mobile-event-detail.png`。
- DesktopからMobileへのレイアウト変更は自然で、長いイベント名も破綻せず折り返される。
- キーボードフォーカスはヘッダー、月操作、日付の順に概ね論理的に進む。Mobileメニューは名前付きボタンとモーダルの意味を持ち、Escで閉じられる。
- 白黒を基調にイベント色を小さく使う表現は、情報量があっても騒がしくしないブランド方針と概ね整合する。

### Findings

#### PD-001 日次価値より月間カレンダーが主役に見える

- **ID:** PD-001
- **優先度:** P1
- **対象画面・フロー:** Step 1〜2、トップページを開く／今日の情報を確認する
- **観察事実:** DesktopとMobileの初期表示では、月間カレンダーが最も大きい面積を占め、「今日のイベント」と「今日はなんの日」はその後に配置される。「今日のイベント」が空の場合も、空状態のカードが一定の面積を占める。根拠: `01-desktop-top.png`、`07-mobile-today.png`。
- **ユーザーへの影響:** 初見または短時間の訪問では、Sakalogを「今日の発見があるアーカイブ」よりも月間予定の確認ツールとして理解しやすく、日々再訪する価値が伝わりにくい。
- **PRODUCT.md / DESIGN.mdとの関係:** `PRODUCT.md` のDesign Principle 1「毎日開く理由をつくる」と、`DESIGN.md` のCreative North Starおよび「今日の出来事、今後の予定、過去の記録を近い導線でつなぐ」というDoに対して部分的な不整合がある。機能自体は存在するが、視覚的な優先順位が目的を十分に支えていない。
- **改善の方向性:** 今日の要約をカレンダーより先、または同等以上の優先度で認識できる構成を検討する。イベントがない日の空状態は情報の意味を保ったまま圧縮し、「今日はなんの日」を日次の発見として目立たせる案が考えられる。

#### PD-002 イベント発見が説明のない色ドットへ依存する

- **ID:** PD-002
- **優先度:** P1
- **対象画面・フロー:** Step 3〜4、月を変更する／イベントを見つける
- **観察事実:** 月間カレンダーには複数色のイベントドットが表示されるが、画面内に色の意味を示す凡例がない。日付リンクのアクセシブル名は日付の数字のみで、イベント件数や種別を含まない。根拠: `03-desktop-next-month.png`、`04-desktop-event-found.png`、`08-mobile-next-month.png`、DOM確認。
- **ユーザーへの影響:** 視覚利用者は色の意味を推測する必要がある。色覚特性のある利用者やスクリーンリーダー利用者は、選択前にイベントのある日やイベント種別を発見しにくい。
- **PRODUCT.md / DESIGN.mdとの関係:** `PRODUCT.md` の「色だけに依存せず情報を伝える」というAccessibility & Inclusionに対して不整合がある。`DESIGN.md` は選択後の一覧で種別ラベルと名称を表示することを求めており、その点は満たす一方、選択前の発見段階ではMeaningful Color Ruleの意味がユーザーへ説明されていない。
- **改善の方向性:** カレンダーの密度を損なわない凡例や補助表示を検討する。日付のアクセシブル名には年月日、イベント件数、必要に応じて種別を含め、色を認識できなくてもイベント日を探索できる状態を目指す。

#### PD-003 カレンダーの構造と選択状態が支援技術へ伝わらない

- **ID:** PD-003
- **優先度:** P1
- **対象画面・フロー:** Step 3〜4、月を変更する／イベントを見つける
- **観察事実:** DOM確認では、カレンダーにtableまたはgridとしての意味がなく、選択日にも `aria-current` または `aria-selected` が付与されていない。トップページの主要見出しはH2から始まり、ページ主題を表すH1がない。
- **ユーザーへの影響:** スクリーンリーダー利用時に曜日と日付の対応、現在選択中の日、ページ全体の主題を把握しにくい。日付を連続して探索する際の現在位置も見失いやすい。
- **PRODUCT.md / DESIGN.mdとの関係:** `PRODUCT.md` のWCAG 2.2 AA相当とキーボード操作の方針に対して改善余地がある。`DESIGN.md` のHeadlineはページ名と詳細画面の主題に使う定義であり、トップページに主題見出しがない現状とは緊張がある。
- **改善の方向性:** 実装方式に応じてtableまたはARIA gridの適切な意味構造と月ラベルを検討する。今日と選択日の違いを視覚だけでなくARIAでも伝え、トップページにはページ主題を示すH1を設ける方向が考えられる。

#### PD-004 空状態の補助文字が低コントラストである

- **ID:** PD-004
- **優先度:** P1
- **対象画面・フロー:** Step 2〜3、今日の情報を確認する／月を変更する
- **観察事実:** 今日または選択日にイベントがない場合の14px補助文字は、前景色40%相当で表示される。ライト背景との推定コントラストは約2.6:1である。根拠: `01-desktop-top.png`、`03-desktop-next-month.png`、`07-mobile-today.png`、`08-mobile-next-month.png`、スタイル確認。
- **ユーザーへの影響:** 弱視の利用者や低輝度環境では、「イベントがない」という現在の状態を読み取りにくい。
- **PRODUCT.md / DESIGN.mdとの関係:** `PRODUCT.md` のWCAG 2.2 AA相当のコントラスト方針、および `DESIGN.md` のCompact Clarity Ruleと「小さく薄い文字だけで重要情報を伝えない」というDon'tに対して不整合がある。
- **改善の方向性:** 空状態を通常文字として扱い、4.5:1以上を確保できる補助テキスト用の色またはトークンを検討する。文字の薄さ以外の方法で情報階層を維持する。

#### PD-005 イベント詳細から選択日へ戻る文脈がない

- **ID:** PD-005
- **優先度:** P2
- **対象画面・フロー:** Step 5、イベント詳細を確認する
- **観察事実:** ライブ詳細にはツアー情報、各日程、参加状態が表示されるが、遷移元である8月9日のイベント一覧へ戻るパンくずや明示的なリンクはない。継続探索にはブラウザの戻る操作が必要となる。根拠: `05-desktop-event-detail.png`、`10-mobile-event-detail.png`。
- **ユーザーへの影響:** 同日の別イベントや「今日はなんの日」にある過去イベントへ探索を続ける際、選択していた日付の文脈を失いやすい。
- **PRODUCT.md / DESIGN.mdとの関係:** `PRODUCT.md` のPositioningとDesign Principle 3「過去とこれからをつなぐ」、`DESIGN.md` の現在・今後・過去を近い導線でつなぐDoに対し、詳細から日付軸へ戻る接続が弱い。
- **改善の方向性:** 遷移元の日付を保持し、「8/9のイベントへ戻る」のような明示的な戻り導線、または日付を含むパンくずを検討する。直接訪問時の戻り先も含めて別途仕様判断が必要である。

#### PD-006 Desktopで主要ナビゲーションが重複する

- **ID:** PD-006
- **優先度:** P2
- **対象画面・フロー:** Step 1〜4、Desktopのトップページ
- **観察事実:** Desktopでは、ヘッダーナビゲーションと右側ナビゲーションに同じ主要項目が繰り返し表示される。根拠: `01-desktop-top.png`、`03-desktop-next-month.png`、`04-desktop-event-found.png`。
- **ユーザーへの影響:** 画面内の情報階層が分散し、どちらが主ナビゲーションか判断する小さな負荷が生じる。また、日次情報や今後の予定へ使える領域が減る。
- **PRODUCT.md / DESIGN.mdとの関係:** `PRODUCT.md` のBrand Personality「整理されている」とDesign Principle 4「楽しくても騒がしくしない」、`DESIGN.md` の静かな情報面という方向性に対して改善余地がある。重複自体を禁じる確定ルールはない。
- **改善の方向性:** 主ナビゲーションの役割を一箇所へ集約できるか検討する。右側領域を残す場合は、今日の要約、今後の予定、関連する過去記録など、主フローを補完する情報へ役割を変える案が考えられる。

#### PD-007 Mobileの操作対象が最小サイズに留まる

- **ID:** PD-007
- **優先度:** P2
- **対象画面・フロー:** Step 3〜4、Mobileの月操作／日付選択
- **観察事実:** Mobileの日付リンクは24 × 24 CSS px、メニューと月操作は高さ32 CSS pxである。日付リンクはWCAG 2.2 AAのTarget Size (Minimum) 24 CSS pxを満たすが、頻繁に使うタッチ操作としては余裕が少ない。根拠: `07-mobile-today.png`、`08-mobile-next-month.png`、`09-mobile-event-found.png`、要素サイズ確認。
- **ユーザーへの影響:** 片手操作、移動中の操作、運動機能に制約がある状況では、隣接する日付や月操作を誤って押す可能性が高まる。
- **PRODUCT.md / DESIGN.mdとの関係:** `PRODUCT.md` のAccessibility & Inclusionに関係する。`DESIGN.md` は選択日の視覚サイズを24pxと定義しているが、ヒット領域まで24pxに限定するとは定めていないため、見た目を維持したまま操作性を高める余地がある。
- **改善の方向性:** 24pxの選択円を維持しつつ、透明な余白を含むヒット領域を40〜44px程度まで広げられるか検討する。カレンダー全体の密度と隣接ターゲットの重なりは実装前に確認する。

#### PD-008 「Today」だけが英語で表示される

- **ID:** PD-008
- **優先度:** P3
- **対象画面・フロー:** Step 1〜3、トップページ／今日の情報を確認する／月を変更する
- **観察事実:** 月操作と情報見出しの大部分は日本語だが、現在日に戻る操作だけが「Today」と英語で表示される。根拠: `01-desktop-top.png`、`03-desktop-next-month.png`、`07-mobile-today.png`、`08-mobile-next-month.png`。
- **ユーザーへの影響:** 操作理解への影響は小さいが、親しみやすく整理された日本語UIとしてのコピーの一貫性を弱める。
- **PRODUCT.md / DESIGN.mdとの関係:** `PRODUCT.md` のBrand Personality「親しみやすく、楽しく、整理されている」との整合性に小さな改善余地がある。`DESIGN.md` に表示言語の確定ルールはないため、これは仕様違反ではない。
- **改善の方向性:** 「今日」など周辺コピーと同じ言語へ揃える案を、プロダクト全体の用語方針と合わせて検討する。

### Design Principles Alignment

| PRODUCT.mdのDesign Principle | 整合度 | 一次評価 |
|---|---|---|
| 1. 毎日開く理由をつくる | 部分整合 | 今日のイベントと「今日はなんの日」は実装されているが、初期画面では月間カレンダーより下位に見える。 |
| 2. 思い出が育つほど楽しくする | 整合 | 「今日はなんの日」とライブ参加状態により、蓄積した履歴を振り返る価値が見える。 |
| 3. 過去とこれからをつなぐ | 部分整合 | 選択日では現在イベントと過去イベント、詳細では今後の日程と参加記録がつながる。一方、詳細から日付軸へ戻る接続が弱い。 |
| 4. 楽しくても騒がしくしない | 概ね整合 | 白黒中心の静かな面と小さな意味色は一貫している。Desktopの重複ナビゲーションには整理の余地がある。 |
| 5. 動きは状態を伝えるために使う | 評価保留 | 安定撮影でreduced motionを使用したため、通常モーション時の品質と用途は十分に確認していない。reduced motion下では閲覧を妨げる動きは観察されなかった。 |

アクセシビリティ方針については、キーボードの基本的なフォーカス順とMobileメニューの操作は概ね成立している。一方、色ドット、カレンダーの意味構造、選択状態、空状態のコントラストにはP1の改善余地がある。ブランド面では「親しみやすく、楽しく、整理されている」「情報量が多くても落ち着いて見続けられる」という方向性は概ね保たれている。

### Evidence Limitations

- 一次証拠は `/tmp/sakalog-audit-2026-07-13/` に保存したスクリーンショットと監査メモであり、現時点ではGit管理していない。
- 採用したスクリーンショットは `01-desktop-top.png`、`03-desktop-next-month.png`、`04-desktop-event-found.png`、`05-desktop-event-detail.png`、`07-mobile-today.png`、`08-mobile-next-month.png`、`09-mobile-event-found.png`、`10-mobile-event-detail.png` である。
- 検証はライトテーマ、Desktop 1幅、Pixel 7相当のMobile 1幅、Chromiumに限定している。レスポンシブ境界全体や実機固有の挙動を網羅していない。
- スクリーンリーダーによる読み上げは実施しておらず、アクセシブル名、DOMの意味構造、キーボードフォーカスのスポット確認から影響を推定している。
- 空状態テキストのコントラスト値は、確認したスタイルとライト背景からの推定値であり、専用の全画面コントラスト検証結果ではない。
- reduced motionを使用したため、通常時のアニメーション、遷移、マイクロインタラクションは評価していない。
- Google OAuthは監査対象外であり、認証回避、自動操作、自動化検知の偽装は行っていない。
- 本監査はProduct Design観点の一次結果である。Findingと改善の方向性は仮説として扱い、後続のImpeccable Review、実装制約の確認、Issue単位のDecisionを経て採否と優先順位を判断する必要がある。

## Impeccable Review

本節は、Product Design Auditを観察仮説として参照しつつ、ImpeccableのCritiqueとTechnical Auditを独立実施した結果である。Critiqueはデザイン判断と主要閲覧フローの体験品質、Technical Auditはコードと測定可能な技術品質を扱う。両者のFindingは後段のConsolidated Findingsで根本原因ごとに統合する。

### Critique

Critiqueは独立した2エージェントで実施した。Assessment Aはデザインレビュー、Assessment Bはdetectorと証拠確認を担当し、Aの完了後にBの結果を統合した。詳細スナップショットは `.impeccable/critique/2026-07-13T08-45-48Z__app-authenticated-page-tsx.md` を参照する。

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | システム状態の可視性 | 2/4 | 月・日変更の待機状態が弱く、Mobileでは選択結果が画面外に残る。 |
| 2 | 現実世界との一致 | 3/4 | カレンダーと公演語彙は自然だが、`Today`だけ言語が揺れる。 |
| 3 | ユーザーの制御と自由 | 2/4 | 詳細から元の日付・該当公演へ戻る文脈がない。 |
| 4 | 一貫性と標準 | 3/4 | 視覚語彙は一貫するが、リンクの見え方とナビの役割が揺れる。 |
| 5 | エラー防止 | 3/4 | 月境界などは堅実だが、密な小ターゲットが誤操作を招く。 |
| 6 | 再認優先・記憶負荷削減 | 2/4 | 色ドットの意味と選択日を記憶させ、詳細で再探索させる。 |
| 7 | 柔軟性と効率 | 2/4 | Today移動はあるが、年月ジャンプや該当公演への直行がない。 |
| 8 | 美的・最小限のデザイン | 3/4 | 静かで整理される一方、重複ナビとカード反復が冗長。 |
| 9 | エラー認識・診断・回復 | 2/4 | フォーム以外の取得失敗・回復状態を主要閲覧フローで確認できない。 |
| 10 | ヘルプと文書 | 0/4 | 色ドットの凡例、カレンダー状態の説明、該当公演への案内がない。 |
| **Total** | | **22/40** | **Acceptable — 堅実な基盤だが主要フローに大きな改善余地** |

#### IMP-C-001 「今日」と「思い出」が月間カレンダーの下位に見える

- **優先度:** P1
- **観察事実:** 月間カレンダーが最大の面積と視覚重量を持ち、「今日のイベント」「今日はなんの日」は下段の同格カードとして現れる。予定がない日は空状態で体験が終わる。
- **影響:** Sakalogが「毎日新しい発見がある推し活アーカイブ」より月間予定表として理解されやすく、日々再訪する報酬が弱い。
- **改善方向:** 今日の日付、今日の予定、過去の今日を主役モジュールとしてまとめ、予定がない日も過去の出来事や次の予定へ接続する。月間カレンダーは探索の二次導線として扱う。

#### IMP-C-002 選択日・該当公演の文脈がライブ詳細へ継承されない

- **優先度:** P1
- **観察事実:** 選択日のライブから遷移してもURLはライブIDだけで、ライブ全体の先頭へ着地する。複数会場の後に全公演が続き、元の日付へ戻る導線もない。
- **影響:** ユーザーは選択日を記憶して会場と公演を再探索する。イベント発見から参加記録へ向かう中心フローが切れる。
- **改善方向:** 日付またはperformanceIdを遷移へ含め、該当公演を先頭表示、アンカー移動、強調のいずれかで特定できるようにする。元の日付へ戻る導線と直接訪問時の戻り先も定義する。

#### IMP-C-003 イベント発見が説明のない色ドットと曖昧な日付状態に依存する

- **優先度:** P1
- **観察事実:** 色ドットは最大3個で凡例、件数、読み上げ説明がない。日付リンク名は数字だけで、今日と選択日はリングと黒丸だけで区別する。
- **影響:** 色を認識できない利用者はイベント日を探索できず、視覚利用者も今日と選択日の状態を学習しにくい。4件以上の日は情報が無通知で省略される。
- **改善方向:** 完全な日付、今日／選択状態、イベント件数と種別をアクセシブル名で公開し、視覚側にも凡例または`+N`を追加する。

#### IMP-C-004 Mobileでは日付選択の操作性と結果フィードバックが弱い

- **優先度:** P1
- **観察事実:** 日付は24×24px、メニューと月操作は約32pxである。日付選択後の一覧はカレンダー下の画面外に残り、イベント名リンクは通常本文と近い見え方である。
- **影響:** 片手利用では誤タップしやすく、選択結果が見えないため操作成功の確信が弱い。タッチ環境では詳細への導線も認識しにくい。
- **改善方向:** 視覚円とヒット領域を分離して40〜44pxを確保し、選択結果を近接表示、穏やかなスクロール、件数更新などで即時に伝える。

#### IMP-C-005 重複ナビとカードの一括展開が隠れた認知負荷を生む

- **優先度:** P2
- **観察事実:** Desktopはヘッダーと右側パネルへ重複したナビ項目を表示する。ライブ詳細では複数会場を全展開した後、全公演を横方向へ提示する。
- **影響:** 選択肢の走査と現在地判断に負荷がかかり、該当公演と参加記録が他の情報に埋もれる。
- **改善方向:** 主要ナビを一箇所へ集約し、右側領域には日次情報など主フローを補完する役割を与える。詳細は該当または直近公演を優先し、他の情報を段階開示する。

#### IMP-C-006 低コントラスト・待機・フォーカス・回復状態が揃わない

- **優先度:** P2
- **観察事実:** `text-foreground/40`と`/50`はライトテーマの14px本文でAAを下回る。月・日変更の明示的pending、統一した2px focus-visible、取得失敗時の回復導線が揃っていない。
- **影響:** 弱視、低輝度、遅い回線、キーボード利用の各状況で、情報と現在状態を把握しにくい。
- **改善方向:** AAを満たす文字階調、統一focus-visible、pending、再試行状態を定義し、40%文字は非テキストまたは非必須情報に限定する。

#### Cognitive Load

8項目中5項目がFailで高負荷と評価した。Single focus、Grouping、One thing at a timeは成立する一方、Chunking、Visual hierarchy、Minimal choices、Working memory、Progressive disclosureが失敗する。主因はDesktopの重複ナビ、詳細の全会場・全公演、選択日を詳細で記憶し直すmemory bridgeである。

#### Emotional Journey

到着時は静かな配色で安心できるが、「今日」への期待は弱い。予定がない日は空状態が小さな落胆を作り、月変更は予測可能でも待機フィードバックが薄い。イベント発見後はMobileで結果が画面外に残り、詳細では該当日を再探索するため報酬が遅れる。終点の参加記録はProduct Purposeに強く合うが、そこへ至る感情曲線が長く沈む。

#### Product Design Auditとの照合

- **一致:** 日次価値の弱さ、色ドット依存、カレンダーの意味構造、低コントラスト、重複ナビ、小さなMobile対象、`Today`の言語不一致を独立評価でも確認した。
- **再評価:** PD-005の「戻り文脈」を、該当公演へ直行できず再探索を強いる主要フロー断絶としてP2からP1へ引き上げた。
- **追加:** カード反復によるSakalog固有性の希薄化、Mobileで選択結果が画面外に残る報酬遅延、月変更のpending不足、長期アーカイブに対する年月ジャンプ不足を追加した。
- **留保:** deterministic detectorは0件で典型的なAI slopの不在を支持したが、UX上のFindingを否定する証拠ではない。

### Technical Audit

Technical Auditは対象コード、コンパイル済みCSS、自動検出、コントラスト計算、PlaywrightによるCSS実測を用いて実施した。保存済み認証状態の失効により、認証済み画面の新規動的視覚確認は行わず、同じコンパイル済みCSSへの対象マークアップ注入と既存監査画像を補助証拠とした。

#### Audit Health Score

| # | Dimension | Score | Key Finding |
|---|---|---:|---|
| 1 | Accessibility | 2/4 | カレンダーの意味構造・状態と複数のAAコントラスト違反。 |
| 2 | Performance | 2/4 | トップ表示で全期間データを取得し、未使用フォントも常時転送する。 |
| 3 | Responsive Design | 2/4 | 320px幅で実測3pxの横スクロールが発生する。 |
| 4 | Theming | 2/4 | 基本トークンはあるが、意味色がテーマ別コントラストを保証しない。 |
| 5 | Anti-Patterns | 3/4 | 露骨なAI slopはないが、反復カードと入れ子カードが残る。 |
| **Total** | | **11/20** | **Acceptable — 技術品質に有意な改善が必要** |

#### IMP-A-001 カレンダーの関係・状態・イベント情報がプログラム的に決定できない

- **優先度:** P1
- **Location:** `components/events/EventCalendar.tsx:53-115`
- **Category:** Accessibility
- **Impact:** スクリーンリーダー利用者は年月日、曜日、今日、選択状態、イベント件数と種別を把握できない。
- **WCAG / Standard:** WCAG 2.2 1.3.1、1.3.3、4.1.2
- **Recommendation:** tableまたは適切なARIA gridとして関係を公開し、日付へ完全な名前、状態、件数を付与する。ドットは装飾扱いとし、同等情報をテキストで提供する。

#### IMP-A-002 テキスト・意味色のコントラストが複数箇所でAA未達

- **優先度:** P1
- **Location:** `components/events/EventList.tsx:36-115`、`components/events/OnThisDay.tsx:22-82`、`components/ui/Badge.tsx:7-15`、`components/ui/Button.tsx:14-21`、`components/lives/LiveDetail.tsx:118-152`
- **Category:** Accessibility / Theming
- **Impact:** 12〜14pxの空状態、補助情報、種別ラベル、危険操作を判読しにくい。
- **WCAG / Standard:** WCAG 2.2 1.4.3
- **Recommendation:** 意味色ごとにライト／ダーク別のforeground・surfaceペアを定義し、4.5:1以上を自動検証する。`/40`と`/50`は本文へ使用しない。
- **Measured values:** `foreground/40`はライト2.55:1・ダーク3.40:1、`foreground/50`はライト3.41:1。ライトテーマのバッジはライブ2.47:1、リリース3.18:1、動画2.25:1、誕生日2.97:1。dangerボタンの白文字と`red-500`は3.76:1。

#### IMP-A-003 320px幅で月操作が横へはみ出す

- **優先度:** P1
- **Location:** `components/events/MonthSelector.tsx:101-132`、`app/(authenticated)/page.tsx:43-56`
- **Category:** Responsive Design
- **Impact:** 320px幅または400%ズーム相当で横スクロールが発生し、右端操作が欠ける。
- **WCAG / Standard:** WCAG 2.2 1.4.10
- **Recommendation:** 狭幅ではTodayを別行へ移す、年月と前後操作を二段化する、または短いラベルへ切り替える。
- **Measured values:** viewport 320pxに対してbody `scrollWidth`は323px、月ナビ右端は323.14pxだった。

#### IMP-A-004 フォーカスと現在地の表現がプロダクト基準へ届かない

- **優先度:** P2
- **Location:** `components/events/MonthSelector.tsx:103-145`、`components/layout/Header.tsx:59-73`、`components/layout/TopNavigationPanel.tsx:23-37`
- **Category:** Accessibility
- **Impact:** キーボード利用者は密な操作で現在位置を失いやすく、支援技術へナビゲーションの現在地が伝わらない。
- **WCAG / Standard:** WCAG 2.2 2.4.7、4.1.2、`DESIGN.md`の2px focus ring規定
- **Recommendation:** 全操作要素へ統一した2px `focus-visible`リングを実装し、現在のナビ項目へ`aria-current="page"`を付与する。
- **Measured values:** Todayボタンのフォーカスはブラウザ既定の`outline: auto 1px`だった。

#### IMP-A-005 reduced-motion設定でもドロワー移動と進捗アニメーションが維持される

- **優先度:** P2
- **Location:** `components/layout/Header.tsx:100-111`、`components/ui/NavigationProgress.tsx:101-115`、`components/ui/PendingLink.tsx:68-77`
- **Category:** Accessibility / Theming
- **Impact:** 動きに敏感な利用者のOS設定が反映されず、パネル移動、背景blur、spinner、pulseが維持される。
- **WCAG / Standard:** WCAG 2.2 2.3.3（AAA）、`prefers-reduced-motion`、`PRODUCT.md` / `DESIGN.md`の必須方針
- **Recommendation:** reduced motion時はtranslateを即時切替または短いcrossfadeへ変え、spinnerとpulseも静的な状態表示へ置換する。
- **Measured values:** `reducedMotion: reduce`でもドロワーのtransition durationは`0.2s`だった。

#### IMP-A-006 トップページが全期間のライブ・リリース・動画を取得してから絞り込む

- **優先度:** P2
- **Location:** `usecases/getTopPageContent.ts:43-158`、`repositories/liveRepository.ts:306-323`、`repositories/releaseRepository.ts:187-204`、`repositories/songRepository.ts:500-535`
- **Category:** Performance
- **Impact:** アーカイブが育つほど、毎日の主要導線の転送量、マッピング量、キャッシュサイズが線形に増える。
- **WCAG / Standard:** Web Performance Best Practices、Supabase/PostgREST payload minimization
- **Recommendation:** 月範囲、選択日、月日履歴を渡す専用read queryまたはRPCを設け、重複する取得を一つのread modelへ集約する。
- **Measured values:** トップページは合計9本のSupabase問い合わせを並列実行し、ライブ公演、リリース、MV、関連動画は日付範囲なしで取得する。

#### IMP-A-007 使用していないGeistフォントを全ページで52.4KB転送する

- **優先度:** P2
- **Location:** `app/layout.tsx:1-15`、`app/globals.css:15-37`
- **Category:** Performance
- **Impact:** 主要閲覧フローで使用しないフォントが毎セッション転送され、初期ロードとキャッシュ容量を消費する。
- **WCAG / Standard:** Core Web Vitals supporting practice、unused resource elimination
- **Recommendation:** Geist SansをRootLayoutから外し、Geist Monoは実際に使うWikiやMarkdown編集surfaceへ局所化する。
- **Measured values:** 共通レイアウトで23,108Bと29,288B、合計52,396Bのwoff2をロードした。

#### IMP-A-008 頻繁なMobile操作が44px拡張基準を下回る

- **優先度:** P2
- **Location:** `components/events/EventCalendar.tsx:89-100`、`components/layout/Header.tsx:87-95`、`components/events/MonthSelector.tsx:103-145`
- **Category:** Responsive Design / Accessibility
- **Impact:** 片手操作、移動中、運動機能に制約がある状況で誤タップが増える。
- **WCAG / Standard:** WCAG 2.2 2.5.8の24pxは満たす。WCAG 2.5.5（AAA）と主要モバイルガイドラインの44px基準には不足する。
- **Recommendation:** 24pxの選択円を維持しつつ、セルまたは透明領域で40〜44pxのヒット領域を確保する。メニューと月操作も44pxへ拡張する。

#### IMP-A-009 ライブ詳細で同型カードの反復とカード内カードが発生する

- **優先度:** P2
- **Location:** `components/lives/LiveDetail.tsx:173-328`、`components/lives/AttendanceControl.tsx:95-200`
- **Category:** Anti-Pattern
- **Impact:** DOMと視覚境界が増え、同じ公演情報が会場一覧と公演一覧へ重複する。重要な参加記録が入れ子の最深部へ押し込まれる。
- **WCAG / Standard:** ImpeccableのIdentical Card Grids / Nested Cards禁止、`DESIGN.md`のカード抑制方針
- **Recommendation:** 会場概要を軽いリストまたは見出しへ変え、公演カードと役割を分離する。参加状態は公演面の一部として表現する。

#### Patterns & Systemic Issues

- 透明度だけで文字階層を作るため、ライトテーマを中心にAA未達が繰り返される。
- 意味色を同じ色と12.5%背景で機械的に組み合わせ、テーマ別コントラストを保証していない。
- `focus-visible`、`motion-reduce`、`aria-current`などの状態規約が共通コンポーネントへ定着していない。
- カレンダー用read modelの一部が日付範囲をRepository境界へ渡さず、アーカイブ成長と取得量が結び付いている。
- Mobile対応は主要breakpointでは成立するが、320px、ズーム、44px操作領域までの検証が不足している。

#### Positive Findings

- `html lang="ja"`、`header`、`main`、`nav`、`aside`、詳細画面の`h1`は適切に使われている。
- Headless UI DialogによりEsc、背景タップ、フォーカストラップ、スクロールロックが確保されている。
- `next/image`へ寸法があり、ロゴのCLSを防いでいる。
- Server Components、`Promise.all`、共有read cacheが使われ、クライアント側のlayout thrashingはない。
- OSダークモードへ追従する背景・前景トークンと、`md` / `lg`で構造的に変わるレイアウトが実装されている。
- 24pxの日付リンクはWCAG 2.2 AAの最小ターゲット基準を満たす。
- Typecheck、Lint、deterministic detectorはいずれも成功した。

#### Verification Notes

- `pnpm typecheck`: pass
- `pnpm lint`: pass
- Impeccable detector: 対象TSX 8ファイルで0件
- Playwrightはローカル接続に成功したが、保存済み認証状態が失効して対象ページはログインへリダイレクトされた。認証の迂回は行っていない。
- 320px、focus、dark、reduced-motionは、同じコンパイル済みCSS上へ対象マークアップを一時注入して測定した。
- 動的な対象フローの視覚確認は既存のProduct Design Audit画像を補助証拠として使用した。
- Technical Auditではコード、UI、`PRODUCT.md`、`DESIGN.md`を変更していない。

## Consolidated Findings

### CF-001 日次価値と情報階層が画面構造へ反映されていない

- **ID:** CF-001
- **最終優先度:** P1
- **テーマ:** 今日の発見、情報アーキテクチャ、カード依存
- **根本原因:** Product Purpose上の優先順位ではなく、既存機能とナビゲーションを同じ視覚重量のカードへ配置している。トップと詳細の双方で、情報を減らさず一括表示することが構造設計の代替になっている。
- **統合したFinding ID:** PD-001、PD-006、IMP-C-001、IMP-C-005、IMP-A-009
- **Product / UXへの影響:** 「毎日開く理由」と「思い出が育つ楽しさ」が第一印象にならず、Sakalogが月間予定表または汎用管理画面として理解されやすい。詳細では重要な参加記録が反復カードの奥へ埋もれる。
- **技術的根拠:** トップはカレンダーを主列先頭へ置き、日次情報はその下の2カードで表示する。Desktopはヘッダーと右側パネルに重複ナビを持つ。詳細は会場カード、全公演カード、参加記録カードを連続・入れ子で描画する。
- **改善方針:** 今日、過去の今日、次の予定を主役として再構成し、カレンダーを探索導線へ位置付ける。主要ナビを集約し、詳細は該当または直近公演を優先して他情報を段階開示する。
- **分類:** redesign
- **優先度判断:** ナビ重複とカード反復単独はP2だが、PD-001とIMP-C-001が示すProduct Purposeへの直接的な不整合を根本原因として含むため、統合後はP1とする。

### CF-002 カレンダーに共有された意味モデルがない

- **ID:** CF-002
- **最終優先度:** P1
- **テーマ:** イベント発見、セマンティクス、色依存、状態表現
- **根本原因:** 日付、曜日、今日、選択、イベント件数・種別を一つのカレンダー状態モデルとして定義せず、視覚上の数字、リング、黒丸、色ドットへ分散している。
- **統合したFinding ID:** PD-002、PD-003、IMP-C-003、IMP-A-001
- **Product / UXへの影響:** 色を認識できない利用者やスクリーンリーダー利用者がイベント日を発見できない。視覚利用者も今日と選択日の意味を学習しにくく、4件以上の日は情報を見落とす。
- **技術的根拠:** `EventCalendar`は`div` gridで、曜日と日付の関連、完全な日付名、`aria-current` / `aria-selected`、イベント件数を持たない。ドットは最大3件でテキスト代替がない。
- **改善方針:** カレンダーの情報モデルを先に定義し、tableまたはARIA grid、完全なアクセシブル名、今日／選択状態、件数、色以外の種別表現へ一貫して投影する。
- **分類:** hardening
- **優先度判断:** Product Design、Critique、Technical AuditのすべてでP1であり、WCAG 2.2 AA方針と主要タスクの双方に直接影響するためP1を維持する。

### CF-003 Mobileのカレンダー操作が狭幅・タッチ・結果表示を一体で設計できていない

- **ID:** CF-003
- **最終優先度:** P1
- **テーマ:** Responsive Design、タッチ操作、選択フィードバック
- **根本原因:** 24pxの視覚円、月操作の単一行配置、選択後一覧の位置を個別仕様として扱い、320pxからMobile全体の操作シーケンスを検証していない。
- **統合したFinding ID:** PD-007、IMP-C-004、IMP-A-003、IMP-A-008
- **Product / UXへの影響:** 片手利用で誤タップしやすく、日付を選んでも結果が画面外に残る。320pxまたはズーム環境では横スクロールも発生する。
- **技術的根拠:** 日付は24×24px、メニューと月操作は32〜34px。320px実測ではbody `scrollWidth`が323pxとなり、WCAG 1.4.10のリフロー要件に抵触する。
- **改善方針:** 24pxの視覚円と40〜44pxの操作領域を分離し、狭幅では月操作を二段化する。日付選択後の結果を近接表示または明示的な状態変化で伝える。
- **分類:** redesign
- **優先度判断:** ターゲットサイズ単独はAAを満たすためP2だが、Critiqueで確認した結果フィードバック不足とTechnical Auditで測定したAAリフロー違反を合わせ、主要Mobileフローの問題としてP1に引き上げる。

### CF-004 日付起点の文脈がイベント詳細まで継続しない

- **ID:** CF-004
- **最終優先度:** P1
- **テーマ:** 過去とこれから、ディープリンク、継続探索
- **根本原因:** ライブ詳細をライブIDだけの独立ページとして設計し、遷移元の日付または該当公演をルーティング・表示状態へ含めていない。
- **統合したFinding ID:** PD-005、IMP-C-002
- **Product / UXへの影響:** イベントを発見した直後に日付と公演を再探索するmemory bridgeが生じ、同日の別イベントや参加記録へ進む流れが切れる。
- **技術的根拠:** `EventList`と`OnThisDay`のライブリンクは`/lives/{liveId}`だけで、詳細はライブ全体の先頭から全会場・全公演を描画する。戻り導線もない。
- **改善方針:** 日付またはperformanceIdをURLへ含め、該当公演へ直接着地できる表示状態を設計する。遷移元の日付へ戻る導線と直接訪問時のfallbackも決める。
- **分類:** redesign
- **優先度判断:** PD-005は回避可能な戻り導線不足としてP2だったが、Critiqueで「該当公演への再探索」という主要フロー断絶まで確認したため、Product Principle 3への影響を優先してP1へ引き上げる。

### CF-005 状態・意味色・テーマ品質が共通コンポーネントへ定着していない

- **ID:** CF-005
- **最終優先度:** P1
- **テーマ:** コントラスト、フォーカス、待機、回復、reduced motion
- **根本原因:** 透明度と単一の意味色を全テーマへ流用し、default / focus / pending / error / reduced motionを共通の検証済み状態契約として管理していない。
- **統合したFinding ID:** PD-004、IMP-C-006、IMP-A-002、IMP-A-004、IMP-A-005
- **Product / UXへの影響:** 弱視、低輝度、キーボード、遅い回線、動きに敏感な利用者が情報または現在状態を把握しにくい。Productが明記するWCAG 2.2 AAとOS設定尊重を満たせない。
- **技術的根拠:** ライトテーマの`foreground/40`は2.55:1、バッジは2.25〜3.18:1、dangerボタンは3.76:1。フォーカスは1pxブラウザ既定で、`aria-current`がない。reduced motionでもドロワーtransitionは0.2秒のままである。
- **改善方針:** テーマ別の意味色ペアとAA自動検証、2px focus-visible、`aria-current`、pending / retry、motion-reduce代替を共通コンポーネントの受け入れ条件にする。
- **分類:** hardening
- **優先度判断:** Critiqueでは複数状態をまとめてP2としたが、Technical Auditで複数のWCAG AAコントラスト違反を測定し、PD-004もP1であるため、統合後はP1とする。

### CF-006 アーカイブ成長と主要閲覧フローの取得コストが結び付いている

- **ID:** CF-006
- **最終優先度:** P2
- **テーマ:** Performance、read model、静的アセット
- **根本原因:** カレンダー表示に必要な期間をRepositoryへ渡さず全期間データを取得する設計と、surface単位でフォントを読み分けないRootLayout設計が残っている。
- **統合したFinding ID:** IMP-A-006、IMP-A-007
- **Product / UXへの影響:** 記録が育つほど毎日のトップ表示が重くなり、Product Purposeである長期アーカイブの成長が閲覧性能を悪化させる。未使用フォントは現在も固定コストを発生させる。
- **技術的根拠:** トップは9本のSupabase問い合わせを行い、ライブ、リリース、MV、関連動画を全期間取得する。RootLayoutでは使用していないGeist 2書体、合計52,396Bをロードする。
- **改善方針:** 月範囲・選択日・月日履歴に特化したread modelまたはRPCへ変更し、キャッシュキーとpayloadを必要範囲へ絞る。フォントは使用surfaceへ局所化する。
- **分類:** implementation
- **優先度判断:** 現時点でタスク完了を妨げる実測障害はなく、共有キャッシュと並列取得も存在するためP2とする。ただしアーカイブ成長に比例するため、長期計画からは外さない。

### CF-007 UIコピーの言語と外部遷移表現が揃っていない

- **ID:** CF-007
- **最終優先度:** P3
- **テーマ:** UX Writing、一貫性
- **根本原因:** 主要閲覧フローの日本語用語と外部リンク表現を一つのコピー規約として管理していない。
- **統合したFinding ID:** PD-008、IMP-CのMinor Observations
- **Product / UXへの影響:** 操作理解への影響は小さいが、日本語UIとしての親しみやすさと仕上がりを弱める。
- **技術的根拠:** 現在日に戻る操作だけが`Today`であり、外部動画リンクは新規タブ遷移を明示しない。グループ名区切りには英語カンマが残る。
- **改善方針:** 「今日」へ統一し、外部リンク、新規タブ、区切り文字を含む閲覧UIのコピー規約を既存変更IssueのAcceptance Criteriaへ含める。
- **分類:** hardening
- **優先度判断:** すべて回避可能でタスク完了やアクセシビリティを直接阻害しないため、PD-008と同じP3を維持する。

## Recommended Roadmap

依存関係は「Product Purposeに沿う体験の再設計」→「カレンダーと詳細の状態モデル確定」→「共通技術品質のhardening」→「性能改善」→「統合検証」の順で扱う。Technical AuditのRecommended Actionsをそのまま実装順にはしない。

| Phase | 対象CF | 目的 | Product Designによる再設計 | 推奨Impeccable command | Issue分割方針 |
|---|---|---|---|---|---|
| Phase 1: 主要体験のDecision | CF-001、CF-004 | 「今日」を主役にし、日付発見から該当公演・参加記録まで一本の文脈を定義する | 必要 | `$impeccable shape` | トップIAと詳細着地は同じジャーニーDecisionで扱う。ただし実装Issueはトップ再構成と詳細ルーティング／着地へ分割可能。 |
| Phase 2: カレンダー操作モデル | CF-002、CF-003 | 視覚、セマンティクス、Mobile配置、選択結果を一つのカレンダー状態モデルとして確定する | 必要 | `$impeccable adapt` | table / ARIA grid、Mobileレイアウト、結果フィードバックを一つの設計Issueで決め、実装は意味構造とresponsiveへ分割する。 |
| Phase 3: Design System hardening | CF-005 | 意味色、focus、pending、error、retry、reduced motionを共通コンポーネントへ定着させる | 部分的に必要 | `$impeccable harden` | 色トークン／コントラストと、interaction state／motionを2 Issue程度へまとめる。画面単位には分割しない。 |
| Phase 4: Read performance | CF-006 | アーカイブ成長とトップ表示コストを分離し、固定アセット費も除去する | 不要 | `$impeccable optimize` | 日付範囲read modelはRepository / cache / RPCを含む1 Issue、フォント局所化は小規模な別Issueまたは同時変更のsubtaskとする。 |
| Phase 5: Copy and integrated QA | CF-007、CF-001〜CF-006 | コピー整合と主要フロー全体の再監査を行い、改善が別の回帰を生んでいないことを確認する | 不要 | `$impeccable polish` | コピーだけの単独Issueは原則作らず関連Issueへ同梱する。最後にDesktop / Mobile / dark / reduced motion / 320px / keyboardの横断QA Issueまたはチェックリストを置く。 |

## Related Issues

CF-001 / CF-004はIssue #341でDecisionを確定し、1 Issue = 1 PRで実装できる#343〜#347へ分割した。その他はConsolidated Findingsを実装可能な単位へまとめた未起票候補であり、Findingを機械的に1件1Issueへ対応させない。

| 状態 | Issue化候補 | 対象CF | 想定スコープ | 備考 |
|---|---|---|---|---|
| #343 | SakalogのGlobal Navigationを再編する | CF-001 | Desktop Header、Archive dropdown、Mobile IA、role別表示 | #341 Global Navigation。#344の前提。 |
| #344 | SakalogトップページをDaily Story構成へ再編する | CF-001 | Today Schedule、Next Events、Recent Attendance、TopNavigationPanelの役割廃止 | #341 Daily Story。#343完了後に実施。 |
| #345 | 選択日を起点に過去同日へ接続する閲覧体験を実装する | CF-001 | Past Same-Day timeline、選択月日への追従、Calendarの二次導線化 | #344の後に実施。CF-002 / CF-003の意味・操作モデルは対象外。 |
| #346 | 日付からライブ該当公演まで閲覧文脈を継承する | CF-004 | 選択日・performance context、該当公演への着地、戻り、fallback | #345の後に実施。 |
| #347 | ライブ公演と参加記録の情報構造を整理する | CF-001、CF-004 | 該当公演と参加状態・参加記録の近接、nested card解消 | #346の公演contextを前提に実施。 |
| 未起票 | アクセシブルなカレンダー操作モデル | CF-002、CF-003 | カレンダー構造、状態、件数、凡例、320px、ヒット領域、選択結果フィードバック | 設計Issueを先に置き、実装はsemanticとresponsiveへ分割可能。 |
| 未起票 | 閲覧UIのテーマ・状態hardening | CF-005 | 意味色、コントラスト、focus、current、pending、retry、reduced motion | 画面別ではなく共通トークン／コンポーネント別にまとめる。 |
| 未起票 | トップページread model最適化 | CF-006 | 日付範囲query / RPC、cache key、payload、計測 | UI再設計とは独立実施できるが、Phase 1〜2で必要データ形状が変わる場合はDecision後に着手する。 |
| 未起票 | 共通フォント読み込みの局所化 | CF-006 | Geist Sans削除、Geist Monoのsurface限定、転送量再計測 | 小規模なためread model Issueへ同梱するか、独立する場合も1 Issueに留める。 |
| 未起票 | 主要閲覧フロー統合QA | CF-001〜CF-007 | Desktop、Mobile、320px、dark、reduced motion、keyboard、screen reader spot check、性能再計測 | 実装IssueのAcceptance Criteriaへ分散させつつ、最終横断確認として残す。Playwright認証状態を再作成して実施する。 |

Issue起票時は各CFをそのままタイトルにせず、同じDecisionまたは同じ共通コンポーネントへ収束する単位でAcceptance Criteriaを定義する。Product PurposeまたはTarget Design Systemを変える判断が生じた場合のみ、`PRODUCT.md` / `DESIGN.md`の更新要否をIssue上で明示する。
