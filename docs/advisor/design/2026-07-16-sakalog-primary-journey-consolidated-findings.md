# Sakalog Primary Journey — Consolidated Findings & Recommended Roadmap

- 作成日: 2026-07-16 JST
- 対象実装: `refactor/347-attendance-adjacency` / Issues #343〜#347 統合状態
- 入力: [Design QA](./2026-07-15-sakalog-primary-journey-design-qa.md)、[Technical Audit](./2026-07-15-sakalog-primary-journey-technical-audit.md)、[2026-07-13 Primary Flow Audit](./2026-07-13-sakalog-primary-flow.md)
- 正典: [PRODUCT.md](../../../apps/oshikatsu-web/PRODUCT.md)、[DESIGN.md](../../../apps/oshikatsu-web/DESIGN.md)、Issue #341 Decision、[ADR 0013](../../decisions/0013-sakalog-primary-journey-daily-story.md)
- 方針: visual symptomとtechnical causeをroot cause単位で統合する。既存report、正典、アプリケーションコードは変更せず、Issueも起票しない。

## 1. Executive Summary

Design QAとTechnical Auditを統合した結果、実装候補へ残すroot causeは**P1 4件、P2 3件、P3 3件の計10件**である。CF-001のDaily Story hierarchyとCF-004のdate/performance context continuityは解決済みであり、Issue候補から除外した。Issue #347で解決済みのpending競合防止、save/cancel/delete後のfocus restoration、save status notification、global retryも再計上しない。

最重要の結論は次のとおり。

1. **Direct fallback overflowは単独のresponsive Bugで閉じる。** 原因はfallback carouselのpaint containment不足であり、attendance反復とは同じsurfaceに見えてもroot causeが異なる。local `contain: paint`相当の境界と3 viewport regression testが最小修正で、carousel全面再設計やglobal `overflow-x: hidden`は不要である。
2. **Fallback attendance反復は別のP2 presentation Refactorにする。** 18個のstateful controlと59 focus targetは、共通state/action modelを維持したまま、fallbackではcompact static status、active/expanded cardだけfull controlをmountすることで局所解決できる。contextual viewではattendanceをsetlistより前へ置き、danger actionをquietにする。同じpresentation contractの問題として扱うが、overflow Bugとは結合しない。
3. **CalendarはDecisionを先行させる。** semanticsとresponsive interactionは、table/gridの選択、today/selected/event state、keyboard model、選択結果のfocus/announcementが相互依存するため、同じDecisionで扱う。実装はsemantic foundationとnarrow/mobile interactionの2 Issueへ分ける。
4. **CF-005は3境界へ分ける。** semantic color / focus-visible / current stateは共通UI hardening、field error / live region / edit-open focusはform accessibility、reduced motionはmotion contractとして独立させる。解決済みpending/focus restorationを含めない。
5. **CF-006はquery architectureを2 Issue、fontをsmall cleanupへ分ける。** global Daily Story read modelと、personal attendance/auth compositionはcache・security境界が異なる。shared cacheは置換せず、global read Issueのinvariantと計測対象にする。未使用Geist 52,996Bは独立P3 cleanupとし、性能Refactorへ便乗させない。

推奨順は、fallback overflowの止血、calendar Decision、P1 accessibility foundation、calendar実装、attendance presentation、motion、read architecture、P3 polishである。通常のcontextual primary journeyは維持しつつ、P1とjourneyに直接関わるP2を閉じた後に統合再監査する。

## 2. Consolidated Findings

### CF-R01 — Direct fallbackのdocument-level horizontal overflow

- **Priority:** P1
- **User-visible symptom:** direct visit / invalid context fallbackで、Mobile 320/390pxだけでなくDesktop 1440pxでもページ全体が数千px横へ移動する。inner carouselとdocumentの2本の水平scroll axisが生まれ、touch、trackpad、keyboardで現在位置を失う。
- **Technical root cause:** `flex + shrink-0 + snap + 85%/320px card × 18`のstripをcarousel自身は`overflow-x:auto`で保持するが、paint containmentがなく、descendantのscrollable overflowがChromiumのroot `html`へ伝播する。body/main幅や`min-width`だけの問題ではない。
- **Related previous CF:** CF-003、CF-004のdirect fallback境界、DQA REG-001
- **Design QA evidence:** 390pxで`scrollWidth=5410px`、1440pxで`scrollWidth=5885px`。[Mobile fallback](./evidence/2026-07-15-sakalog-primary-journey/design-qa/mobile-09-direct-fallback-viewport.png)
- **Technical Audit evidence:** root ownerは`html`。maxScrollXは320pxで4079、390pxで5020、1440pxで4445。carouselへ一時的なpaint containmentを適用すると、inner scrollを維持したまま全viewportでroot overflowが0になった。[320px evidence](./evidence/2026-07-15-sakalog-primary-journey/technical-audit/fallback-320.png)
- **Status:** **Regressed**
- **Recommended fix boundary:** `LiveDetail` fallback carouselのlocal containmentと、320/390/1440のroot/inner scroll regression testのみ。global `html/body overflow-x:hidden`、card縮小、snap廃止、carousel全面再設計、attendance presentation変更は含めない。paint containmentによるfocus ring、shadow、popover clippingを検証する。

### CF-R02 — Live detailのattendance presentationがcontextと情報量へ適応しない

- **Priority:** P2
- **User-visible symptom:** fallbackでは18公演すべてに「参戦記録」、未登録copy、CTAが反復する。contextual viewでもsetlistが長い過去公演ほど自分の記録が下へ押され、「解除」が「編集」より強く見える。
- **Technical root cause:** `PerformanceCard`がcontext/fallbackを問わず最大密度の`AttendanceControl`と固定section orderを持つ。fallbackでも18個のform/pending/effect/ref/action instanceをmountし、presentation densityとdomain state modelが分離されていない。
- **Related previous CF:** CF-004のremaining adjacency、DQA REG-002 / REG-003、DQA-P2-002 / DQA-P2-004
- **Design QA evidence:** 18 attendance submodule、13 record CTA。setlist-rich Mobileではattendance開始が約y=970。[Attended context](./evidence/2026-07-15-sakalog-primary-journey/design-qa/mobile-08-attended-context-full.png)
- **Technical Audit evidence:** 18 stateful AttendanceControl、59 focusable target（23 button / 36 link）、13 empty copy。carousel自体は無名かつ`tabIndex=-1`で、最後までfocus移動するとinner scrollLeftは5323になる。
- **Status:** **Regressed**（fallback） / **Remaining**（contextual adjacency）
- **Recommended fix boundary:** state/action logicは共通のまま、presentationを`context full`と`fallback compact`へ分ける。fallbackはstatic attendance statusを基本に、選択・展開した1公演だけfull controlをmountする。context fullは基本情報直後にattendance、後段にsetlistを置き、danger actionをquiet secondaryにする。carousel layout、mutation semantics、#347で解決済みのpending/focus restorationは変更しない。全面再設計は不要。

### CF-R03 — Calendarのsemantic modelとresponsive interaction modelが未決定

- **Priority:** P1
- **User-visible symptom:** screen readerには日付が「15」のような数字として並び、today、selected、曜日、イベント有無・件数が伝わらない。keyboardでは42 linkをTabで通過する。320pxでは月操作が3pxはみ出し、24〜34pxの主要targetと、選択後にoffscreenへ残るfocusが連続探索を妨げる。
- **Technical root cause:** visual classesとcolor dotがdate stateの唯一のprojectionで、year/month/day/today/selected/event summaryを共有するsemantic DTOがない。MonthSelectorはsingle-rowのminimum inline sizeを持ち、route更新とresult focus/announcementの契約もない。
- **Related previous CF:** CF-002、CF-003
- **Design QA evidence:** calendarは`div` grid、24px date link、最大3 dot。390pxはreflowするが、月移動・選択結果・touchの往復costが残る。[Selected date](./evidence/2026-07-15-sakalog-primary-journey/design-qa/mobile-04-selected-0715.png)
- **Technical Audit evidence:** calendar/weekday/42 cellsのroleはnull、ARIA today/selected/event summaryなし、32 dotはunlabeled、arrow-keyなし。320px topは323px。date navigation後、scrollY=0でもfocusは画面外のcalendar linkに残る。
- **Status:** **Remaining**（CF-002はNot addressed、CF-003はImproved but remaining）
- **Recommended fix boundary:** 先に1件のDecisionでtable + date linkかARIA grid + roving tabindexかを決め、today/selected/event state、keyboard、touch、result focus/announcement、month browseとの関係を固定する。その後、(1) `EventCalendar` + semantic DTO、(2) `MonthSelector` + 320/390px interaction/result feedbackの2実装へ分割する。query architectureとDaily Story hierarchyは含めない。

### CF-R04 — Semantic color / focus-visible / current-state primitiveが共通契約になっていない

- **Priority:** P1
- **User-visible symptom:** light/darkの補助情報、badge、danger actionが読みにくく、密なcalendarやnavigationでkeyboard focusと現在地を見失いやすい。
- **Technical root cause:** foreground alphaやbrand/event colorを用途別contrast検証なしで文字色へ再利用し、focus/current stateもscreen固有classへ分散している。Button/TextLink/navigation/Badge間に共通state contractがない。
- **Related previous CF:** CF-002、CF-005、CF-007のnavigation metadata
- **Design QA evidence:** muted textと同系色badgeの低contrast contract、active navがvisual-only、danger buttonの強いweightを確認。
- **Technical Audit evidence:** light primary flowで28件以上のdirect text failure。代表値1.53:1〜3.40:1、danger約3.76:1。calendar focusはbrowser default 1px、active routeに`aria-current`なし。
- **Status:** **Remaining**
- **Recommended fix boundary:** light/dark別semantic foreground/surface pair、自動contrast test、共通2px `focus-visible`、navigationの`aria-current="page"`をUI primitivesへ実装する。form error semanticsとmotionは別Issue。`DESIGN.md`の変更で実装不足を代替しない。

### CF-R05 — Reduced-motion対応がnavigation/pending primitivesへ貫通しない

- **Priority:** P2
- **User-visible symptom:** OSでmotion削減を指定しても、Mobile drawerが移動し、route pendingのspinnerとprogress pulseが動き続ける。
- **Technical root cause:** reduced-motion overrideが個別classへ散在し、drawer transition、`PendingLink`、`NavigationProgress`を束ねるmotion contractがない。
- **Related previous CF:** CF-005、DQA-P2-006
- **Design QA evidence:** `prefers-reduced-motion: reduce`でもdrawerの0.2s transitionを確認。
- **Technical Audit evidence:** reduce環境でdrawerのtransform/translate、PendingLink `animate-spin`、NavigationProgress `animate-pulse`が残る。
- **Status:** **Remaining**
- **Recommended fix boundary:** Header drawerとshared pending/progress primitivesのみ。reduce時は移動を除去し、instant stateまたはnon-moving crossfade、static status indicatorへ置換する。通常motionの再設計は含めない。

### CF-R06 — Shared form error semanticsとedit開始focusが欠ける

- **Priority:** P1
- **User-visible symptom:** validation/server errorがどのfieldに属するか、submit後に何が起きたかを支援技術が把握できない。「編集」を開くとfocusが`body`へ落ちる。
- **Technical root cause:** Input/Select/Textareaの`error` propはvisual border/textだけを変え、stable error ID、`aria-invalid`、`aria-describedby`を生成しない。FormErrorBanner/delete errorもlive-region contractを持たず、edit state mount時のfocus targetがない。
- **Related previous CF:** CF-005、DQA REG-005 / DQA-P2-003
- **Design QA evidence:** edit-open focus loss、shared fieldsのARIA relation欠落、FormErrorBannerのlive region欠落を確認。[Edit form](./evidence/2026-07-15-sakalog-primary-journey/design-qa/desktop-11-attendance-edit.png)
- **Technical Audit evidence:** select/input/textareaで`aria-invalid=null / aria-describedby=null`。bannerはstyled `<p>`、delete errorもplain paragraph。
- **Status:** **Remaining**
- **Recommended fix boundary:** shared field primitives、FormErrorBanner、AttendanceControlのedit-open / first-invalid focusのみ。descriptionとerror IDをmergeし、async errorのpolitenessを定義する。#347で解決済みのpending競合、save/cancel/delete後focus restoration、save status notificationはnon-goalとする。

### CF-R07 — Daily Storyのglobal/personal read architectureがcache missとarchive growthへ耐えない

- **Priority:** P2
- **User-visible symptom:** 日々開くトップが、archive増加、cache invalidation、cache unavailable時ほど遅くなりやすい。Daily Story追加後に固定read costと変動幅が増えた。
- **Technical root cause:** global loaderはall-period live/release/MV/videoを取得してJSで複数用途へ再走査し、Next Eventsの月queryを追加する。shared global read完了後にAuthとpersonal attendance全件readを開始するためpage-level waterfallもある。cacheはmiss costを隠すが、bounded read modelの代替になっている。
- **Related previous CF:** CF-006、DQA REG-004 / DQA-P2-005
- **Design QA evidence:** 全期間3系統 + Next最大12か月 + Recent Attendance。local dev network-idleは1.48〜8.05sと変動したが、絶対値ではなくfan-outをFinding根拠とした。
- **Technical Audit evidence:** shared cache missは13〜35 Supabase data calls。video内2 table readはsequential。global read後にAuth + attendanceが直列。cache hitでもpersonal全件readは残り、global resultとpersonal resultがarchive growthに比例する。
- **Status:** **Regressed**
- **Recommended fix boundary:** 2実装へ分ける。(1) global Top Page専用のbounded read DTO/RPC/repository queryでmonth/day/same-day/nextを返し、video内部も並列化する。(2) recent attendanceをDB側order/limitし、global shared chainとpersonal auth/attendance chainを安全に並列composeする。ADR 0006のshared cache/tag方針は維持し、cache hit/miss query budgetとarchive-size independentなresult boundをACにする。UI redesignとfont cleanupは含めない。

### CF-R08 — Primary routeで未使用Geist fontを固定転送する

- **Priority:** P3
- **User-visible symptom:** 視覚的な変化はないが、primary routeで使わないfontを毎セッション取得し、低速回線の初期転送とcache容量を消費する。
- **Technical root cause:** RootLayoutがGeist Sans/Monoをglobalにloadする一方、primary journeyのbodyはArialで、MonoはWiki/Markdown用途に限定される。
- **Related previous CF:** CF-006のfixed cost
- **Design QA evidence:** visual QAでは単独検出なし。read-cost懸念の固定費として相関。
- **Technical Audit evidence:** Playwright resourceでGeist 2本、合計52,996B。primary journeyでは`font-sans` / `font-mono`を使用しない。
- **Status:** **Remaining**
- **Recommended fix boundary:** Geist SansをRootLayoutから除外し、Geist Monoを実使用surfaceへ局所化するsmall cleanup。query architectureやTypography Decisionを含めない。

### CF-R09 — Primary journey copyとexternal affordanceに残差がある

- **Priority:** P3
- **User-visible symptom:** 日本語中心のDaily Story内でMonthSelectorだけ`Today`となり、new-tab external navigationも遷移先の違いを事前に伝えない。
- **Technical root cause:** route/current/external metadataとUX copyの共通checklistがnavigation primitiveへ反映されていない。
- **Related previous CF:** CF-007
- **Design QA evidence:** 新規導線は概ね日本語へ統一されたが、`Today`、external/new-tab表現、英語区切りが残る。
- **Technical Audit evidence:** `Today`とnew-tab hint欠落を確認。viewport内duplicate navigation treeはなく、`aria-current`はCF-R04へ統合した。
- **Status:** **Remaining**
- **Recommended fix boundary:** 「今日」への統一、external linkのaccessible hint、primary journeyの日本語区切り規則だけ。navigation構造やcurrent-state primitiveは含めない。

### CF-R10 — Mobile Next EventsがTodayより大きなread blockになる

- **Priority:** P3
- **User-visible symptom:** MobileでNext Events 4件が約300pxを占め、Today Scheduleより大きく見えるため、成立したDaily Story hierarchyの中盤が未来情報へ偏る。
- **Technical root cause:** Mobile orderingはDecisionどおりだが、4件を同じmetadata densityで常時展開し、同日groupingやsecondary metadataの圧縮がない。
- **Related previous CF:** CF-001のnon-blocking remaining gap
- **Design QA evidence:** Mobile full-pageでNext EventsがTodayより大きな縦量を占める。[Mobile top](./evidence/2026-07-15-sakalog-primary-journey/design-qa/mobile-02-top-full.png)
- **Technical Audit evidence:** technical blockerは検出なし。Server Component境界とtext wrappingは成立。
- **Status:** **Remaining**
- **Recommended fix boundary:** 同日grouping、secondary metadata削減、quiet expansionを比較するpolish。Daily Story order、表示上限、read queryは変更しない。

## 3. Duplicate / Correlation Matrix

| Design QA Finding | Technical Audit Finding | Consolidated Finding |
|---|---|---|
| DQA-P1-001 / REG-001 direct fallback overflow | TA-P1-001 root scroll propagation | **CF-R01** |
| DQA-P1-001のattendance部分 / REG-002 | TA-P2-001 18 controls / 59 targets | **CF-R02** |
| REG-003 / DQA-P2-002 setlist adjacency | shared maximal PerformanceCard composition | **CF-R02** |
| DQA-P2-004 danger visual weight | TA-P1-003 danger contrastのうちpresentation hierarchy | **CF-R02**（contrast token自体はCF-R04） |
| DQA-P1-002 Calendar semantics | TA-P1-002 semantic date model | **CF-R03** |
| DQA-P2-001 Mobile calendar | TA-P2-002 narrow layout / target / result focus | **CF-R03** |
| DQA-P1-003 contrast/state baseline | TA-P1-003 contrast / focus / current | **CF-R04** |
| DQA-P2-006 reduced motion | TA-P2-003 drawer / spinner / pulse | **CF-R05** |
| DQA-P2-003 / REG-005 form error / edit focus | TA-P1-004 + TA-P2-005 | **CF-R06** |
| DQA-P2-005 / REG-004 read fan-out | TA-P2-004 query map / waterfall | **CF-R07** |
| Design QAのCF-006 fixed-cost懸念 | TA-P2-004 font resource subevidence | **CF-R08** |
| DQA-P3-001 / CF-007 | TA-P3-001のToday / new-tab部分 | **CF-R09** |
| DQA-P3-002 Mobile Next Events density | Technical blockerなし | **CF-R10** |
| CF-001 Daily Story hierarchy | Technical Auditで重複計上なし | **Resolved — Issue候補から除外** |
| CF-004 context continuity | Technical Auditでvalidation/return成立 | **Resolved — Issue候補から除外** |
| #347 pending / completion focus / status | Technical Audit positive finding | **Resolved — Issue候補から除外** |

## 4. Recommended Issue Boundaries

| # | 仮タイトル | Type | 対象CF | Goals | Non-goals | Dependencies | 1 Issue = 1 PR |
|---|---|---|---|---|---|---|---|
| I-01 | Direct fallback carouselのroot overflowをcontainする | Bug | CF-R01 | local paint containment、root scroll=0、inner scroll維持、320/390/1440 regression | attendance、carousel redesign、global overflow hidden | なし | **妥当**。小さく高優先の止血PR。 |
| I-02 | Live detailへcontext-aware attendance presentationを導入する | Refactor | CF-R02 | fallback compact/deferred mount、context attendance-before-setlist、quiet danger、semantic grouping | mutation/state分岐、#347 pending/focus、carousel containment | I-01後の方がQAしやすい | **妥当**。同じpresenter APIとcomposition変更で閉じる。 |
| I-03 | アクセシブルなCalendar操作モデルを決定する | Decision | CF-R03 | table/grid、date states、keyboard、touch、month browse、result focus/announceの契約 | 実装、visual polish、query | なし | **PR前提ではない**。Decision承認を実装Issueのgateにする。ADR化する場合だけ別document PR。 |
| I-04 | EventCalendarへsemantic date modelを実装する | Feature / Refactor | CF-R03 | full date name、weekday relation、today/selected、event summary、chosen keyboard model、dot補助化 | MonthSelector layout、data query | I-03 | **妥当**。component + DTO + a11y tests。 |
| I-05 | Calendarの320/390px interactionとresult feedbackを実装する | Feature / Bug | CF-R03 | MonthSelector reflow、40〜44px hit area、選択結果focus/announcement、連続探索 | semantic roleの再Decision、Daily Story order | I-03、原則I-04 | **妥当**。responsive/route interaction testsで閉じる。 |
| I-06 | Primary UIのsemantic color / focus / current stateをhardeningする | Refactor | CF-R04 | AA color pair、2px focus-visible、`aria-current`、light/dark automated checks | form errors、motion、copy変更 | なし | **妥当**。token/primitives横断だが単一state contract。 |
| I-07 | Navigationとpending UIへreduced-motion contractを適用する | Refactor | CF-R05 | drawer movement除去、static pending/progress、media emulation tests |通常motion redesign、loading architecture | なし | **妥当**。対象primitiveが限定される。 |
| I-08 | Shared form error semanticsとAttendance edit-entry focusを実装する | Refactor | CF-R06 | stable error ID、invalid/describedby、live banner/delete error、edit-open/first-invalid focus | pending、save/cancel/delete後focus、business action、visual redesign | なし | **妥当**。shared primitiveと代表consumerを同じPRで検証。 |
| I-09 | Daily Storyのglobal readをbounded Top Page read modelへ置換する | Refactor | CF-R07 | month/day/same-day/next専用query、all-period排除、video並列、cache miss budget、ADR 0006のtag/cache維持 | personal attendance、font、UI | なし | **条件付きで妥当**。DB/RPC変更も同じatomic PRに含め、scopeが膨らむ場合はdomain別でなくread-model vertical sliceを保つ。 |
| I-10 | Recent attendance readをbounded化しglobal/personal chainを並列composeする | Refactor | CF-R07 | DB order/limit、globalとpersonal chainの並列開始、auth/RLS維持、cache hit時もbounded | user dataをshared cache、global query、UI | I-09と独立可能。統合測定は両方後 | **妥当**。security/cache boundaryがI-09と異なる。 |
| I-11 | Primary routeから未使用Geist fontを外す | Refactor / Cleanup | CF-R08 | Sans除外、Mono局所化、resource assertion | typography変更、query optimization | なし | **妥当**。P3単独small PR。 |
| I-12 | Primary journeyの日本語copyとexternal affordanceを整える | Refactor / Polish | CF-R09 | 「今日」、new-tab hint、日本語区切り | current-state semantics、navigation構造 | I-06後なら重複編集を避けやすい | **妥当**。P3だけで閉じ、上位Issueへ便乗させない。 |
| I-13 | Mobile Next Eventsのread densityをpolishする | Feature / Polish | CF-R10 | grouping/metadata/quiet expansionの比較と適用 | order、件数、query、Desktop redesign | I-09後に表示データ契約を確認 | **妥当だが任意**。小さなP3単独PR。 |

### Boundary decisions

- **A — Overflow:** I-01単独で完結する。I-02と同じPRにすると、paint containmentのregressionとDOM/presentation変更の回帰を切り分けられない。I-01のriskはfocus ring/shadow/popover clippingとinner scroll/snap退行であり、局所runtime testで管理する。
- **B — Attendance repetition:** compact variantで局所解決可能。state logicをforkせず、static presenterとfull interactive presenterが同じattendance stateを読む。full controlのconditional mountまで行い、copyを隠すだけで59-target問題を残さない。carousel全面再設計は不要。
- **C — Calendar:** Decisionはまだ必要で、semanticsとresponsive interactionを同じDecisionに含める。実装はI-04/I-05へ分ける。
- **D — CF-005:** I-06は読取りUIのsemantic state、I-08はvalidation/error/focus lifecycle、I-07はmotion preferenceとして分離する。global retryと#347 completion focus/pendingは対象外。
- **E — Read cost:** global Supabase/read DTO、cache miss、archive growthはI-09へ統合する。personal auth/attendance serial chainはI-10。shared cacheは置換IssueにせずI-09のinvariant、fontはI-11のP3 cleanupにする。

## 5. Recommended Implementation Order

1. **I-01 — P1 fallback overflow止血。** 直接訪問のreflow blockerを最小差分で除去する。
2. **I-03 — Calendar Decision。** I-04/I-05のsemantic/interaction contractを先に固定する。
3. **I-06、I-08 — P1 accessibility foundation。** UI state primitiveとform lifecycleは独立PRとして並行可能。
4. **I-04 → I-05 — Calendar実装。** semantic foundationの後にnarrow/touch/result feedbackを載せる。
5. **I-02 — Attendance presentation。** overflow修正済みのfallbackでcompact densityを評価し、context adjacencyも同時に整える。
6. **I-07 — Reduced motion。** primary navigation/pendingの残存CF-005を閉じる。
7. **I-09、I-10 — Read architecture。** global bounded modelとpersonal bounded chainを別PRで実装し、両方後に統合budgetを測る。
8. **I-11、I-12、I-13 — P3単独cleanup/polish。** 上位Issueへ混ぜず、効果と編集競合を見て選択する。

I-02、I-06、I-08はI-03のDecision待ちではない。I-09とI-10も実装上は並行可能だが、before/after query計測は同じfixtureと計測手順を使う。

## 6. Deferred P3 / Polish List

- **CF-R08 / I-11:** unused Geist 52,996Bの除去。性能P2へ混ぜず、resource assertionを持つ単独cleanup。
- **CF-R09 / I-12:** `Today`→「今日」、external new-tab hint、日本語区切りの統一。`aria-current`はP1 I-06に残す。
- **CF-R10 / I-13:** Mobile Next Eventsの同日grouping、secondary metadata圧縮、quiet expansion。Daily Story orderと表示件数は変更しない。
- DetectorのArial `overused-font` warningは`DESIGN.md`正規指定に対するfalse positiveで、Issue候補にしない。
- Contextual flowのDesktop visual polishや通常animationの追加は新たな根拠がなく、今回Roadmapへ入れない。

## 7. Re-audit Plan

### Focused Design QA

- **I-01完了後:** 320/390/1440のdirect/invalid fallbackでroot scroll、inner touch/trackpad/keyboard scroll、snap、focus ring clippingだけをfocused QAする。
- **I-02完了後:** fallback全18件のscan/tab density、registered/unregistered compact state、active full control、setlist-rich contextual detail、danger hierarchyをDesktop/Mobileで再評価する。
- **I-04 + I-05完了後:** date selection、過去同日、month browse、event選択までをkeyboard/touch/screen-reader spot checkで再実行する。
- **I-06 + I-07 + I-08完了後:** light/dark、reduced motion、focus-visible、form validation/server/delete error、edit-openと解決済みcompletion focusが共存することを再確認する。

### Impeccable Technical Audit

- **I-01完了後:** containment ownershipだけのtargeted responsive auditを行う。
- **I-04〜I-08完了後:** accessibility / responsive / interaction-state detectorとPlaywright matrixを再実行する。I-08で#347のresolved focus/pendingがregressしていないことも確認するが、新規Findingとしては数えない。
- **I-09 + I-10完了後:** cache hit/miss、today/selected、Next early/late、cache-disabled相当、archive-size fixtureでquery count/result size/waterfallを再計測する。I-11を実施した場合はfont resourceも同時確認する。

### Full primary journey re-audit and final conditions

Full Product Design Design QAとImpeccable Technical Auditは、**I-01、I-02、I-04〜I-10完了後**に同じcommitを対象として再実行する。I-11〜I-13はP3のため最終判定をblockしない。

最終`Adopt`条件は次のとおり。

- P0/P1が0件で、CF-R01〜R07に未合意のjourney-blocking P2がない。
- 320/390/1440でdocument-level overflowがなく、意図したcarouselだけが水平scrollする。
- calendarのtoday/selected/event stateが非色依存で、採用したkeyboard model、touch target、result feedbackが一貫する。
- primary journeyのtext/semantic colorがAA、focus-visible/current state、form error/live region、reduced motionが正典を満たす。
- contextual journeyの`date → performance → この公演 → attendance → 次/全体 → 元の日付`が維持され、fallbackのinteraction densityが抑えられる。
- cache miss query budgetとresult boundが明文化され、archive growthに比例するall-period/top personal readがない。shared cache unavailable時もcorrectnessとbounded costを維持する。
- #347で解決済みのpending競合防止、status通知、save/cancel/delete後focus restorationがregressしていない。

## 8. Documentation Disposition

`design-qa.md`と`technical-audit.md`は、いずれもcurrent implementation、実施日、viewport、evidence、Run Notesを持つため、**`docs/advisor/design/`配下へ保存すべき正式なpoint-in-time report**として扱うのが妥当である。既存の2026-07-13 Auditを置換・更新せず、別reportとして追加する。

推奨canonical filenameは次のとおり。

- `docs/advisor/design/2026-07-15-sakalog-primary-journey-design-qa.md`
- `docs/advisor/design/2026-07-15-sakalog-primary-journey-technical-audit.md`
- `docs/advisor/design/2026-07-16-sakalog-primary-journey-consolidated-findings.md`（本report）

Evidence linkを壊さないため、formalization時はevidenceもstableなdocs配下へ置くか、repo-root基準のEvidence Manifestを同じdocumentation-only changeで用意する。元reportのFinding、score、実施日、結論は書き換えない。

`docs/advisor/design/README.md`のAudits tableには次の3 entryを追加する。

| Date | Product | Scope | Report role |
|---|---|---|---|
| 2026-07-15 | Sakalog | Issues #343〜#347 Primary Journey Integrated Design QA | point-in-time Design QA |
| 2026-07-15 | Sakalog | Primary Journey Impeccable Technical Audit | point-in-time Technical Audit |
| 2026-07-16 | Sakalog | Primary Journey Consolidated Findings & Recommended Roadmap | root-cause consolidation / non-binding roadmap |

各entryは2026-07-13 reportをbaselineとして参照し、`supersedes`ではなく`follow-up`と明記する。READMEとformal reportの保存は後続のdocumentation-only作業で行い、今回の成果では既存reportやREADMEを変更しない。

### Formalization Note — 2026-07-16

本Dispositionに従い、3 reportを推奨canonical filenameで`docs/advisor/design/`へ保存し、READMEへfollow-up entryを追加した。evidenceは本文から直接参照されるDesign QA 16枚とTechnical Audit 1枚だけを正式保存し、Finding根拠に使わない一時captureはGit管理対象から除外した。この保存処理はFinding、Score、Recommended Roadmapを変更せず、Issue Decisionも新規作成しない。

---

**Consolidated verdict:** 通常のcontextual primary journeyで解決済みのDaily Story hierarchyとcontext continuityは採用し続ける。統合acceptanceはCF-R01、R03、R04、R06のP1と、journeyへ直接影響するCF-R02、R05、R07が閉じるまでblocked。次の作業はI-01のBug実装ではなく、まず本roadmapのIssue boundaryを確認し、I-01とI-03を個別に起票する判断である。
