# Sakalog Primary Journey Technical Audit

- 実施日: 2026-07-15 JST
- 対象実装: `refactor/347-attendance-adjacency` / Issues #343〜#347統合状態
- 対象surface: Sakalog primary journey、top page、calendar、contextual / direct fallback live detail、AttendanceControl、Global Navigation
- Viewport: Desktop 1440 × 1000、Mobile 390 × 844、Narrow 320 × 720
- Browser: Playwright CLI / Node runner + bundled Chromium 1.61.1
- 正典: [PRODUCT.md](../../../apps/oshikatsu-web/PRODUCT.md)、[DESIGN.md](../../../apps/oshikatsu-web/DESIGN.md)、Issue #341 Decision、[ADR 0013](../../decisions/0013-sakalog-primary-journey-daily-story.md)
- 比較対象: [2026-07-13 Sakalog Primary Flow Audit](./2026-07-13-sakalog-primary-flow.md)、[Design QA](./2026-07-15-sakalog-primary-journey-design-qa.md)
- Cache方針: [ADR 0006](../../decisions/0006-orbit-read-cache-strategy.md)
- 変更方針: アプリケーションコード、正典、過去Audit、Design QA reportは変更していない。本reportと追加evidenceのみを新規作成した。

## 1. Technical Health Score

| # | Dimension | Score | Key Finding |
|---|---:|---:|---|
| 1 | Accessibility | 2/4 | Global Navigationとattendance pendingは改善したが、calendar semantics、AA contrast、form error associationが未達。 |
| 2 | Performance | 2/4 | shared cacheはあるが、cache missで13〜35 Supabase data calls、全期間read、ユーザー履歴全件read、未使用font転送が残る。 |
| 3 | Responsive Design | 2/4 | 通常390pxは成立する一方、320px topは323px、direct fallbackは全viewportでdocument-level overflow。 |
| 4 | Theming | 2/4 | light/darkの基本tokenはあるが、opacity階層と意味色pairがAAを保証せず、state tokenも共通化されていない。 |
| 5 | Anti-Patterns | 3/4 | 露骨なAI slopはない。fallbackの18同型cardと59 interaction targetだけがsystemicな反復。 |
| **Total** |  | **11/20** | **Acceptable — significant work needed** |

2026-07-13 Technical Auditも11/20だったが、過去scoreを書き換えたものではない。今回はGlobal Navigation、context continuity、attendance pending/focus restorationが改善する一方、direct fallbackとDaily Story read fan-outが新たな技術負債として相殺している。

### Anti-Patterns Verdict

**Pass with one major exception.** Sakalog全体は白黒中心、8px radius、境界中心の既存systemに従い、gradient text、glassmorphism、hero metric、装飾motion、過剰shadowはない。AI-generated product UIの典型には見えない。

例外はdirect fallbackの18枚の同型PerformanceCardである。card自体のvisual styleより、各cardにsetlist、detail link、full AttendanceControlを反復するtechnical compositionが「同じ操作面の大量複製」を起こす。これはImpeccableのIdentical Card Grids、`DESIGN.md`のCompact Clarity、ADR 0013のquiet archiveに対する実装上のanti-patternである。

## 2. Executive Summary

- Audit Health Score: **11/20（Acceptable）**
- Findings: **P0 0 / P1 4 / P2 5 / P3 1、合計10件**
- Final technical verdict: **blocked**

Design QAの主要Findingはすべてコードまたはruntime DOMで再現した。visual critiqueの反復ではなく、次のroot causeを確定した。

1. direct fallbackのcarouselはlocal `overflow-x:auto`を持つが、18個のnon-shrinking snap itemのscrollable overflowが`html` scrolling elementへも伝播する。body/main幅はviewport内でも、window自体が数千px横移動できる。
2. fallbackは18個のAttendanceControlを同時mountし、59 focusable target、23 button、36 linkを作る。単なるcognitive loadではなく、client state/effect、accessibility tree、tab sequenceのtechnical densityである。
3. calendarは42個の通常linkを並べた`div` gridで、table/grid semantics、today/selected/event countのARIA、arrow-key modelがない。event dot 32個はvisual colorだけで、event存在がaccessible nameに入らない。
4. CF-005は部分改善。attendanceのpending / success/delete focus restoration、drawer focus trap、global retryは成立した。一方、shared field error、FormErrorBanner、edit-open focus、reduced motion、common focus-visible、contrastが残る。
5. top shared readはcache miss時に、今日表示で最少13、条件次第で最大31、別の選択日では最大35のSupabase data callを行う。さらにAuth `getUser`とattendance全件readがglobal read完了後に直列実行される。cache hitでもpersonal readは毎回残る。

最小実装順は、root overflowのlocal containment、calendar semantic model、共通a11y state contract、fallback density、read modelの順である。global `overflow-x:hidden`やpresentation-onlyなcopy変更で根本原因を隠してはいけない。

## 3. Design QA Findingとのcorrelation

| Design QA / CF | Technical Audit status | Correlation | Technical conclusion |
|---|---|---|---|
| DQA-P1-001 direct fallback overflow | **Confirmed / deepened** | 同一root cause | local carouselに`overflow-x:auto`はあるが、root `html`もscrollable。paint containment不足が最小境界。 |
| DQA-P1-001 / REG-002 attendance反復 | **Confirmed / deepened** | 同一experience、別technical sub-cause | 18 AttendanceControl、59 focusable target、18 state/effect instance。presentation variantとdeferred mountで局所対応可能。 |
| CF-002 Calendar semantics | **Confirmed** | 同一root cause | `div` grid + 42 link。共有semantic state modelがない。 |
| CF-003 Mobile interaction | **Confirmed / deepened** | 同一root cause | 320px MonthSelector minimum inline size、24〜34px controls、選択後focus offscreenを確認。 |
| CF-005 focus / pending / error / motion / contrast | **Partially resolved** | 同一systemic gap | pendingとcancel/save/delete focus restorationは解決済み。error association、edit-open focus、motion、contrastは残存。 |
| CF-006 read cost regression | **Confirmed / quantified** | 同一root cause | shared cache miss 13〜35 data calls。video内waterfall、personal read waterfall、全期間result growthを特定。 |
| CF-007 copy / navigation | **Confirmed in technical scope** | 同一residual | `Today`、`aria-current`欠落、external new-tab hint欠落。viewport内のduplicate nav treeはなし。 |
| CF-001 / CF-004 | **No duplicate Finding** | Design QAでResolved | Daily Story hierarchyとcontext URL/validation/returnはtechnicalにも成立。今回Findingへ再計上しない。 |

## 4. P0 / P1 / P2 / P3 Findings

### P0

該当なし。通常のcontextual primary journeyは完遂でき、認証、データ破壊、主要routeの全面停止は確認しなかった。

### P1

#### TA-P1-001 Direct fallbackのscrollable overflowがroot scrolling elementへ伝播する

- **Location:** `components/lives/LiveDetail.tsx:332-350`、特にcarousel `:337`とcard width `:341`
- **Category:** Responsive / Interaction / Technical Design Quality
- **Technical evidence:**
  - 320px: carousel `clientWidth=296 / scrollWidth=4618`、`html.scrollWidth=4399`、最大`window.scrollX=4079`
  - 390px: carousel `366 / 5689`、`html.scrollWidth=5410`、最大`scrollX=5020`
  - 1440px: carousel `1000 / 5972`、`html.scrollWidth=5885`、最大`scrollX=4445`
  - `body`、`main`、LiveDetail rootはviewport内。root overflowのownerは`document.scrollingElement === html`であり、inner carouselだけに閉じていない。
  - 320px evidence: [fallback-320.png](./evidence/2026-07-15-sakalog-primary-journey/technical-audit/fallback-320.png)
- **Root cause:** `flex + shrink-0 + w-[85%]/sm:w-80 + 18 items + gap`が4.6〜6.0k pxのsnap stripを作る。carousel自身は`overflow-x:auto`で幅も`min-width:0`だが、paint containmentを持たず、Chromiumのdocument scrollable-overflow計算へdescendant stripが入る。`-mx-1`は約8pxの差しか生まず主因ではない。
- **Runtime isolation:** `max-width:100%`、`contain:inline-size`、snap解除、card `max-width:100%`、section `overflow:hidden`ではroot overflowが残った。carouselへ`contain:paint`を一時適用した場合だけ、3 viewportすべてで`html.scrollWidth === viewport width / window.scrollX=0`となり、carousel自身のscrollWidthは維持された。
- **Affected viewport / flow:** 320 / 390 / 1440、direct visitまたはinvalid context fallback。touchではrootとinnerのhorizontal panが競合し、Desktop trackpadでもpage全体が横移動可能。keyboard focusはinner carouselをscrollするが、root scroll range自体は残る。
- **Related CF:** CF-003、CF-004 fallback、DQA-P1-001
- **DESIGN / ADR:** `DESIGN.md` Responsive behavior、Compact Clarity、One Edge。Issue #341 / ADR 0013のdirect fallback resilienceを満たさない。WCAG 1.4.10 Reflowにも不適合。
- **Recommended fix boundary:** carousel boundaryへlocal paint containmentを追加し、root scrollを止める。global `html/body overflow-x:hidden`は他surfaceのoverflowとfocus ringを隠すため不可。containment追加後、320 / 390 / 1440、trackpad/touch、focus scroll、full-page captureを再検証する。carousel再設計はroot overflow修正の必須条件ではない。
- **Suggested command:** `$impeccable adapt`

#### TA-P1-002 Calendarに2D semanticsと共有されたdate stateがない

- **Location:** `components/events/EventCalendar.tsx:45-103`
- **Category:** Accessibility / Interaction
- **Technical evidence:** calendar、weekday row、42 date cellの`role`はすべてnull。selected linkにも`aria-label`、`aria-current`、`aria-selected`なし。32 event dotにもrole / label / hidden stateなし。日付はすべて通常linkのため42 tab stopで、arrow-key navigationは実装されていない。
- **Root cause:** visual class (`bg-foreground` / `ring-1` / colored span)がdomain stateの唯一のprojectionで、year/month/day/today/selected/event summaryを表すsemantic modelがcomponent interfaceにない。
- **Affected viewport / flow:** 全viewport、flow 3 / 5 / 6。screen readerは「15」のような数字だけを読み、曜日・年月・today・selected・event有無を関連付けられない。
- **Related CF:** CF-002、CF-003
- **DESIGN / ADR:** `PRODUCT.md` WCAG 2.2 AA / non-color、`DESIGN.md` Calendar Day / Meaningful Color、Issue #341の後続判断に直接対応。
- **Recommended fix boundary:** `EventCalendar`とcalendar presentation DTOまで。month data queryを変える必要はない。通常HTML table + date linkを基本案とし、arrow-keyを正式interactionにする場合だけARIA grid + roving tabindexを選ぶ。`role=application`は不要。todayは`aria-current="date"`、selectedはgridcell stateまたはfull accessible name、event count/type summaryを同じstate modelから生成する。dotは`aria-hidden`にし、意味はcell/link nameへ集約する。
- **Suggested command:** `$impeccable adapt`

#### TA-P1-003 Primary flowのcontrast / focus / current-state contractがAAを満たさない

- **Location:** `components/events/EventCalendar.tsx:51-99`、`components/ui/Button.tsx:14-22`、`components/layout/Header.tsx:72-158,203-239`、各`text-foreground/{40,50,60}` usage
- **Category:** Accessibility / Theming
- **Technical evidence:** 390px lightでdirect textのcontrast failureを少なくとも28件検出。代表値はoff-month date 1.53:1、Hinata badge 1.84:1、live badge 2.46:1、birthday badge 2.97:1、weekday/recent date 2.64〜3.40:1。danger buttonは白/#EF4444で約3.76:1。calendar focusはbrowser default 1pxで、`DESIGN.md`の2px ringではない。共通Buttonに`focus-visible`がなく、明示実装はHeader MenuButton中心。active navに`aria-current`なし。
- **Root cause:** foreground alphaと意味色そのものをtext colorとして再利用し、用途・theme別の検証済みpairがない。focus/current stateもprimitiveではなくscreenごとのclassに分散。
- **Affected viewport / flow:** 全viewport、flow 1〜11。
- **Related CF:** CF-002、CF-005、CF-007
- **DESIGN / ADR:** Compact Clarity、Meaningful Color、Buttons / Inputs / Navigation focus、WCAG 1.4.3、2.4.7/2.4.11、4.1.2。
- **Recommended fix boundary:** color/focus/current tokenとButton / TextLink / PendingLink / navigation / Badge / calendar primitive。alpha値の一括引上げではなく、light/darkそれぞれのsemantic text/background pairを用意し自動contrast testを追加する。共通focus-visible 2px、active routeの`aria-current="page"`をprimitive contractにする。
- **Suggested command:** `$impeccable harden`

#### TA-P1-004 Attendance formのfield errorとform-level errorがaccessibility treeへ接続されない

- **Location:** `components/ui/Input.tsx:10-85`、`Select.tsx:15-45`、`Textarea.tsx:8-22`、`FormErrorBanner.tsx:5-13`、`AttendanceControl.tsx:137-190,247`
- **Category:** Accessibility / Interaction State
- **Technical evidence:** edit formのselect/input/textareaはいずれも`aria-invalid=null / aria-describedby=null`。error paragraphにstable IDがない。FormErrorBannerはstyled `<p>`だけで`role=alert` / `aria-live`なし。delete errorもplain paragraph。
- **Root cause:** shared form primitiveの`error` propがvisual border/textだけを分岐し、semantic state contractを持たない。
- **Affected viewport / flow:** 全viewport、flow 10。validation / server error時、非視覚利用者はどのfieldがinvalidか、submit後に何が起きたか判断しにくい。
- **Related CF:** CF-005、DQA-P2-003、Issue #347 critique follow-up
- **DESIGN / ADR:** `DESIGN.md` Inputs / Error / Recovery、`PRODUCT.md` WCAG 2.2 AA。WCAG 3.3.1、3.3.3、4.1.3。
- **Recommended fix boundary:** shared Input / Select / Textarea / FormErrorBanner。`${id}-error`を安定生成し、error時`aria-invalid=true`、既存descriptionとerror IDをmergeした`aria-describedby`を付与。form-level asynchronous errorは`role=alert`または意図したpolitenessのlive regionにする。AttendanceControl固有patchへ閉じない。
- **Suggested command:** `$impeccable harden`

### P2

#### TA-P2-001 fallbackは18 stateful AttendanceControlと59 focus targetを同時生成する

- **Location:** `LiveDetail.tsx:154-223,332-350`、`AttendanceControl.tsx:42-269`
- **Category:** Performance / Accessibility / Anti-Pattern
- **Technical evidence:** 18 cards、18「参戦記録」、13 empty copy、13 record CTA、合計59 focusable（23 button / 36 link）。carousel自身は`tabIndex=-1`、role/labelなし。firstからlastへfocusするとinner `scrollLeft`は4→5323へ動くが、59 targetを線形に通過する。
- **Root cause:** PerformanceCardがfull AttendanceControlを必須childにし、fallbackとcontextual presentationを同じ密度で共有する。各instanceはform state、pending state、effect、refs、server action bindingsを持つ。
- **Affected viewport / flow:** direct/invalid fallback全viewport。screen reader treeに同名actionが反復し、keyboard userはcarouselを直接操作できずcontrol単位で進む。
- **Related CF:** CF-001 / CF-004、DQA REG-002
- **DESIGN / ADR:** Compact Clarity、Identical Card反復、ADR 0013のviewerへ行動を促しすぎない原則。
- **Recommended fix boundary:** carousel全面再設計は必須ではない。Attendance state/domain actionを維持しつつ、`full` / `compact` presentationを分ける。DOM/state量まで減らすにはpropによるcopy非表示だけでなく、fallback cardはstatic compact statusを描画し、active/expanded cardだけfull AttendanceControlをmountする。cardは`article/li + performance heading`でgroupingし、carousel regionへlabelを付ける。
- **Suggested command:** `$impeccable distill`

#### TA-P2-002 320px MonthSelector、touch target、selected-result focusが一つのinteractionとして破綻する

- **Location:** `MonthSelector.tsx:101-133`、`EventCalendar.tsx:64-99`、`Header.tsx:161-200`
- **Category:** Responsive / Accessibility
- **Technical evidence:** 320px topは`html/body scrollWidth=323`。content幅288pxに対しMonthSelector inline controlsのminimum widthが307px。Today 63×34、prev/next約62×32、calendar day 24×24、menu open/close 32×32。390px topはoverflowなし。日付16をclick後、URLとresultは更新されscrollY=0になるが、focusはcalendar内のselected linkに残り画面外になる。live regionはなかった。
- **Root cause:** `splitTodayButton`のsingle-row flex、month label `min-w-[6rem]`、nowrap controls。date navigationはroute stateだけ更新し、result surfaceへのfocus/announcement contractを持たない。
- **Affected viewport / flow:** 320でreflow failure、320/390のtouch、flow 5。long event/venue textはstacked variantでwrapし、今回clippingは確認しなかった。
- **Related CF:** CF-003
- **DESIGN / ADR:** Mobile structural response、Compact Clarity、WCAG 1.4.10、2.5.8。24pxはAA minimumだがprimary touch controlとして40〜44px hit areaが望ましい。
- **Recommended fix boundary:** MonthSelectorをnarrow時2-rowへ組み替え、Calendar Dayは24px visual circleと40〜44px hit boxを分離。date selection後はresult headingへprogrammatic focusするか、calendar近傍summary + live announcementを採用する。screen reader / keyboardの戻り先もDecision化する。
- **Suggested command:** `$impeccable adapt`

#### TA-P2-003 reduced motionがdrawerとpending animationへ適用されない

- **Location:** `Header.tsx:180-186`、`PendingLink.tsx:68-76`、`NavigationProgress.tsx:108-115`
- **Category:** Accessibility / Motion
- **Technical evidence:** `reducedMotion=reduce`でもdrawer backdrop/panelのtransition durationは0.2sで、panel propertyにtransform/translateが残る。PendingLink `animate-spin`とglobal progress `animate-pulse`にもmotion-reduce overrideなし。Archive chevronだけは`motion-reduce:transition-none`。
- **Root cause:** reduced-motion対応がindividual elementへ追加され、motion primitive全体のcontractになっていない。
- **Affected viewport / flow:** Mobile navigation、全route transition。
- **Related CF:** CF-005
- **DESIGN / ADR:** `PRODUCT.md` Principle 5、`DESIGN.md` Navigation Motion / reduced motion。
- **Recommended fix boundary:** Header drawer + shared PendingLink / NavigationProgress。reduce時はtranslateを除去してinstant stateまたは短いnon-moving crossfade、spinner/pulseはstatic status indicatorへ切替。
- **Suggested command:** `$impeccable animate`

#### TA-P2-004 Daily Story read modelはcache miss fan-outとarchive比例resultを増やす

- **Location:** `app/(authenticated)/page.tsx:42-55`、`getTopPageContent.ts:131-150,290-350,352-430`、`readOrbitMusicData.ts:35-72`、各repository calendar method、`getRecentAttendance.ts:23-44`
- **Category:** Performance / Architecture
- **Technical evidence:** 詳細はSection 8。今日表示のshared cache missで最少13 data calls、Next batch2までで31。別の選択日では初期+2、selected month reuse条件により最大35。Auth `getUser`とpersonal attendance selectはこの後に直列実行。全期間live/release/MV/video、attendance全件を取得する。
- **Root cause:** one large cached compositionでmonth/day/same-day/nextを合成し、repository range boundaryがdomainごとに不均一。Daily Storyは既存all-period dataを再利用する代わりにNext用month callsを追加した。
- **Affected viewport / flow:** flow 1〜5、全viewport。archive growth、domain invalidation直後、shared cache unavailable時に顕在化。
- **Related CF:** CF-006
- **DESIGN / ADR:** 長期archiveがdaily openを遅くするためProduct Purposeと逆行。ADR 0006のshared cache機構には従うが、cache miss costとkey/tag粒度は未解決。
- **Recommended fix boundary:** top専用read DTO / RPCとrepository query boundary。month、selected day、month-day history、next 4、recent 3をDB側でlimit/rangeし、globalとpersonal fetchを可能な範囲でparallel化する。cache tag方針は維持し、query count / payload / TTFB budgetをACにする。
- **Suggested command:** `$impeccable optimize`

#### TA-P2-005 AttendanceControlは終了focus continuityを解決したがedit開始focusが抜ける

- **Location:** `AttendanceControl.tsx:50-109`
- **Category:** Accessibility / Interaction State
- **Technical evidence:** edit click直後の`document.activeElement`は`body`。Cancel後は「編集」へ復帰した。コード上もsave後`edit`、delete後`record`をpendingFocusへ保持し、refresh終了とtarget mountを待ってfocusする。pending中は全action disabled、contentに`aria-busy`、外側に`role=status`を持つ。
- **Root cause:** `openForm()`はtriggerをunmountして`isEditing=true`にするが、form heading/first field refへのfocus effectがない。
- **Affected viewport / flow:** flow 10、registered / empty stateのedit/record開始。
- **Related CF:** CF-005、Issue #347
- **DESIGN / ADR:** Focus continuity。終了側はAcceptanceを満たし、重複Findingにしない。開始側だけが残る。
- **Recommended fix boundary:** AttendanceControlのedit transition。open後、form containerまたはfirst fieldへfocusし、validation submit後はfirst invalid fieldへfocusする。既存pendingFocus/save/delete logicは保持。
- **Suggested command:** `$impeccable harden`

### P3

#### TA-P3-001 Copy / navigation stateのtechnical metadataが揃わない

- **Location:** `MonthSelector.tsx:123-145`、`EventListItem.tsx:107-119`、`Header.tsx:72-148,203-227`
- **Category:** Copy / Accessibility Metadata
- **Technical evidence:** primary flow内の現在日actionだけ`Today`。video linkは`target=_blank / rel=noopener noreferrer`で安全だが、新しいtabをaccessible nameまたは補足copyで示さない。active navはclassのみで`aria-current`なし。一方、Desktop navは`display:none`のMobile tree、Mobileはdesktop treeがhiddenとなるため、同一viewportでduplicate accessible navigationは発生しない。
- **Root cause:** visible copy ruleとnavigation semantic metadataがcomponent contractに含まれていない。
- **Affected viewport / flow:** flow 1 / 5、external video transition。
- **Related CF:** CF-007、CF-005
- **DESIGN / ADR:** UX copy consistency、Navigation current state。
- **Recommended fix boundary:** MonthSelector / EventListItem / nav item primitive。「今日」、new-tab hint、`aria-current=page`を同じcopy/a11y checklistで適用。
- **Suggested command:** `$impeccable clarify`

## 5. Finding detail index

| ID | Severity | Technical evidence | Root cause | Viewport / flow | Related CF | Fix boundary |
|---|---|---|---|---|---|---|
| TA-P1-001 | P1 | root max scrollX 4079 / 5020 / 4445 | carousel paint containment不足 | 320/390/1440 fallback | CF-003/004 | LiveDetail carousel boundary |
| TA-P1-002 | P1 | roles/state null、42 tab stops、32 unlabeled dots | visual-only date model | all / 3,5,6 | CF-002/003 | EventCalendar + semantic DTO |
| TA-P1-003 | P1 | 28+ contrast failures、1px focus、no current | alpha/color/state primitive不在 | all / 1〜11 | CF-002/005/007 | tokens + UI primitives |
| TA-P1-004 | P1 | invalid/describedby/live-region null | error propがvisual-only | all / 10 | CF-005 | shared form primitives |
| TA-P2-001 | P2 | 18 controls、59 targets | full presentation反復 | fallback | CF-001/004 | compact/deferred presenter |
| TA-P2-002 | P2 | top 323px at 320、24〜34px target、offscreen focus | single-row min size + feedback contract不在 | 320/390 / 5 | CF-003 | MonthSelector + calendar result |
| TA-P2-003 | P2 | reduceでも0.2s translate/spin/pulse | motion override分散 | Mobile / nav | CF-005 | motion primitives |
| TA-P2-004 | P2 | 13〜35 data calls + personal waterfall | all-period cached composition | all / 1〜5 | CF-006 | top read DTO/RPC |
| TA-P2-005 | P2 | edit open→body、cancel→edit | form mount focusなし | all / 10 | CF-005 | AttendanceControl transition |
| TA-P3-001 | P3 | Today / new-tab hint / current metadata | copy/a11y contract不在 | all / 1,5 | CF-007 | copy + nav primitive |

## 6. Responsive findings

### Viewport matrix

| Surface | 320px | 390px | 1440px |
|---|---:|---:|---:|
| Top document width | 323px | 390px | 1440px |
| Contextual detail | primary pathはreflow | reflow、Design QAで390px確認 | reflow |
| Direct fallback document width | 4399px | 5410px | 5885px |
| Direct fallback root max scrollX | 4079px | 5020px | 4445px |
| Carousel viewport / content | 296 / 4618px | 366 / 5689px | 1000 / 5972px |
| Card width | 244.8px (`85%`) | 304.3px (`85%`) | 320px (`sm:w-80`) |

### Responsive conclusions

- 390pxの通常topとcontextual pathにはdocument overflowがない。Design QAのprimary route評価は維持する。
- 320px topの3px overflowはMonthSelectorだけで再現し、過去Auditから未解決。
- direct fallbackは「Mobileだけのcard width問題」ではない。Desktopでも18 × 320px + gapのstripがrootへ伝播するため、breakpoint追加では直らない。
- long event/live/venue textはstacked EventListItemでwrapし、320pxでclippingは確認しなかった。
- Touch targetはcalendar 24px、MonthSelector 32〜34px、hamburger/close 32px。visual sizeとhit areaの分離が必要。
- Carouselはkeyboardで59 focusableを進むとinner scrollは追従するが、region自体はfocus不可・無名。touch/trackpadではroot/innerの2水平scroll axisが存在する。

## 7. Accessibility findings

### Confirmed gaps

- Calendar: 2D semantics、full date name、today/selected、event summary、arrow-key modelなし。
- Focus: common Button / linkに2px `focus-visible` contractなし。calendarは1px browser default。
- Contrast: light theme primary flowで28以上のdirect text failure。dark mode構造は維持するが、同じalpha systemのためtoken-level検証が必要。
- Form: field error association、form-level live region、delete error announcementなし。
- Selected result: date route更新後にscroll topへ戻るがfocusはoffscreen calendar linkに残り、live regionなし。
- Reduced motion: drawer movement、spinner、progress pulseが残る。
- Current state: nav `aria-current`なし。
- External link: new-tab hintなし。

### Resolved / positive — Findingsへ重複計上しない

- Mobile Dialog: focus trap、Escape、scroll lock、opener focus return。
- Desktop Archive Menu: pointer/keyboard、expanded state、Escape、trigger focus return。
- Attendance pending: action disable、content `aria-busy`、busy外`role=status`。
- Attendance completion: cancelはtriggerへ復帰。save/deleteもcode上、refreshとtarget mountを待つfocus continuityを実装。
- Error recovery: `app/error.tsx`に「再試行」とtop returnがある。
- Landmarks / language: `html lang=ja`、header/nav/main/aside、detail `h1`がある。
- context validation: date/performance両方をparseし、live内performance/date一致時だけ有効。invalidは推測せずfallback。

## 8. Performance / read-cost findings

### Top page query map

次はshared top loaderが**cache miss**した場合のphysical Supabase data call数である。repository method数ではなく、`findCalendarVideoItems()`内の2 callも分けた。

| Phase / caller | Supabase operation | Calls | Parallel / waterfall | Result growth |
|---|---|---:|---|---|
| `getEventsForMonth(selected)` | `orbit_events` month + birthday month RPC | 2 | 内部parallel | bounded month |
| `getOnThisDay(selected)` | event same-day RPC | 1 | outer parallel | same month/day history |
| `findCalendarPerformances()` | all dated live performances | 1 | outer parallel | **all archive** |
| `findCalendarItems()` | all dated releases | 1 | outer parallel | **all archive** |
| `findCalendarVideoItems()` | all dated MVs + all dated related videos | 2 | **内部sequential** | **all archive × 2 tables** |
| `getEventsForDate(today)` | event date + birthday date RPC | 2 | 内部parallel | bounded day |
| `getEventsForDate(selected)` | event date + birthday date RPC | 0 or 2 | selected=todayならskip | bounded day、month resultと重複 |
| Next batch 1 | today monthを含む3か月 | 4〜6 | month間parallel | selected monthだけreuse |
| Next batch 2 | 残り9か月 | 0〜18 | month間parallel | 4件確定しなければ追加 |
| Recent Attendance | current user attendance full select | 1 | global loader後 | **user archive all rows** |
| Auth guard | `supabase.auth.getUser()` | 1 auth call | global loader後 | fixed |

### Counts by state

- **Today / batch1で4件確定:** shared data 9 + next 4 = **13**。その後Auth 1 + attendance 1。
- **Today / batch2まで:** shared data **31**。その後Auth 1 + attendance 1。
- **別の選択日 / selected monthがNext window外 / batch2まで:** shared data最大 **35**。その後Auth 1 + attendance 1。
- **Shared cache hit:** global data call 0。ただしAuth + attendance full selectは毎回残る。
- `getTopPageData()`をawaitした後に`requireOrbitUser()`とattendanceを開始するため、global read → personal readのpage-level waterfallがある。

### Duplicate and cache analysis

- month queryにtoday/selected eventが含まれていても、today/selected exact-date queryを別に行う。
- Next batchはselected monthと一致する1月分だけ`monthEventsRaw`をreuseする。today monthでは2 future month分4 callsが固定追加。
- live/release/video全期間配列を、month、selected day、same-day history、today、nextのため複数回JS scanする。network payloadだけでなくserver CPUもarchive件数に比例する。
- `unstable_cache` keyはselected date + today dateを含む。selected dateごとに別entryとなり、live/release/songのdomain tag更新はtop variantsを広くinvalidateする。
- `SUPABASE_SERVICE_ROLE_KEY`が利用できない環境ではADR 0006どおりcache自体がdisabledとなり、上記fan-outが毎request発生する。
- 機構としてADR 0006には整合する。問題はcache strategy違反ではなく、「cache missを安価にするrange/limit read model」がないこと。

### Server / client boundary and fixed resources

- Top page、EventCalendar、NextEvents、RecentAttendance、LiveDetail本体はServer Componentであり、全体client化はしていない。
- Client boundariesはHeader、MonthSelector、DaySchedule、PastSameDay、AttendanceControl、TourOverview、PendingLink等へ局所化されている。
- fallbackはAttendanceControlを18 instance mountするため、component codeはbundle内で共有されてもhook/effect/ref/stateとserialized attendance propは18組になる。
- Playwright top resourceでGeistのwoff2を2本、**29,588B + 23,408B = 52,996B**確認。bodyはArialでprimary journeyは`font-sans` / `font-mono`を使わない。Geist MonoはWiki surfaceにだけ必要で、RootLayout固定費にする必要がない。
- local dev resource総量約4.2MBはdev bundle/HMRを含むためproduction合否には使わない。font resourceの有無と転送量だけを固定費evidenceとして採用する。
- next/imageの寸法指定、Server Component composition、outer `Promise.all`、shared cache、selected=today fetch skip、Next batch early confirmationはpositive implementationである。

## 9. Detector results

| Check | Result | Notes |
|---|---|---|
| Impeccable detector | 1 warning | `app/globals.css:37`のArialを`overused-font`として検出。ArialはDESIGN.mdの正規指定なのでfalse positiveとして除外。 |
| Deterministic anti-pattern scan | pass after canonical suppression | gradient text、glass、side stripe、oversized radius、decorative grid等のhitなし。 |
| `pnpm typecheck` | pass | `tsc --noEmit`成功。 |
| `pnpm lint` | pass | ESLint成功。 |
| Playwright runtime checks | issues confirmed | 1440 / 390 / 320、light、reduced motion、keyboard、route focus、DOM/resource measurement。 |
| Console | no primary-route blocking error | Design QA captureと今回操作で主要routeのblocking console errorなし。 |

Detectorはmarkup固有のARIA relation、Supabase call graph、document scrolling ownerを検出しないため、manual deterministic checksとPlaywright measurementを併用した。

## 10. Consolidation candidates

### Design QA Findingと同一root cause

| Consolidation unit | Design QA | Technical Finding | 推奨Issue境界 |
|---|---|---|---|
| Direct fallback containment | DQA-P1-001 | TA-P1-001 | LiveDetail carouselのlocal containment + 3 viewport regression test |
| Fallback attendance density | DQA-P1-001 / REG-002 | TA-P2-001 | compact/deferred Attendance presentation、semantic grouping |
| Calendar interaction model | DQA-P1-002 / DQA-P2-001 | TA-P1-002 / TA-P2-002 | semantic state + keyboard + narrow layout + result focusを1 Decisionに統合 |
| Theme / state hardening | DQA-P1-003 | TA-P1-003 / TA-P2-003 | contrast/focus/current + reduced motionをcommon primitivesで分割実装 |
| Attendance form hardening | DQA-P2-003 | TA-P1-004 / TA-P2-005 | shared form semantics + Attendance transition focus |
| Daily Story read model | DQA-P2-005 | TA-P2-004 | top DTO/RPC、personal limit、cache/query budget |
| Copy consistency | DQA-P3-001 | TA-P3-001 | 関連Issueへ同梱、単独大型Issueにしない |

### Technical Audit固有Finding / sub-finding

- root overflowはbody/mainではなく`html`がownerで、実際に`window.scrollX`が移動する。
- local paint containmentだけがinner scrollを維持しつつrootを止めた。min-width/snap/max-width patchでは解消しない。
- `findCalendarVideoItems()`はouter Promise.all内でも2つのtable readをsequentialに実行する。
- global top read完了後にAuth + personal attendanceを開始するpage-level waterfallがある。
- shared cache missのdata call上限は、today 31、別selected date 35。
- Geist 2 fontがprimary journeyで52,996B転送される。
- date selection後のfocusがoffscreen calendar linkに残る。
- PendingLink spinner / NavigationProgress pulseもreduced-motion未対応。

これらは独立Issueへ機械的に分割せず、上表の同一root cause unitへAcceptance Criteriaとして統合する。

## 11. Recommended implementation order

1. **P1 — `$impeccable adapt`:** LiveDetail carouselへlocal paint containmentを導入し、root scrollを止める。320 / 390 / 1440とkeyboard/touchを先にgreenにする。
2. **P1 — `$impeccable adapt`:** Calendar semantic state modelとMonthSelector/result-focus interactionをDecision化して実装する。
3. **P1 — `$impeccable harden`:** semantic colors、2px focus-visible、`aria-current`、shared field error、FormError live regionをprimitive contractへ統合する。
4. **P2 — `$impeccable distill`:** fallbackをcompact attendance presentation + active cardだけのfull controlへ変更し、59-target sequenceを削減する。
5. **P2 — `$impeccable animate`:** drawer、pending spinner、navigation progressのreduced-motion alternativeを共通化する。
6. **P2 — `$impeccable optimize`:** top read DTO/RPC、range/limit、personal recent 3 query、parallel boundary、font局所化を実装しbudgetを測る。
7. **P3 — `$impeccable clarify`:** 「今日」、new-tab hint、navigation current copy/metadataを整える。
8. **Final — `$impeccable polish`:** 1440 / 390 / 320、light/dark、reduce、keyboard、screen-reader spot check、cache hit/miss計測を統合再実行する。

## 12. Run Notes

- in-app Browserは利用できなかった。直前Design QAと同様、ユーザー許可のもと**Playwright CLI / Node runner + bundled Chromium**を使用した。
- Current rendered implementationは`http://localhost:3001`。認証済みstorage stateをlocalhostだけに使い、外部siteは操作していない。
- 書き込みQAは行っていない。既存attendanceは表示し、「編集」→「キャンセル」だけを実行した。保存・解除・一時data作成なし。
- Runtime style interventionはPlaywright page内の一時DOM styleだけで、reload/context close時に破棄された。repository fileは変更していない。
- Evidence: [technical-audit-evidence](./evidence/2026-07-15-sakalog-primary-journey/technical-audit)、既存の[Design QA evidence](./evidence/2026-07-15-sakalog-primary-journey/design-qa)を参照。
- 320px full-page evidenceはroot widthをそのまま反映し、top 323px、fallback 4399pxで保存された。
- 正式なtechnical evidenceはFindingから直接参照する`fallback-320.png`に限定した。`top-320.png`は本文に数値と再現条件を記録済みで、単独画像がFindingの追跡性を増やさないため一時QA artifactとしてGit管理対象から除外した。
- Performance navigation時間とdev total transferはdev server variabilityが大きいためscoreには使わなかった。call graph、result scope、font resourcesを根拠にした。
- Impeccable detector、typecheck、lintはread-only auditとして実行。code fix、Issue起票、commit、pushは行っていない。
- `.impeccable/critique`の既存untracked filesには触れていない。
- 過去AuditとDesign QAはpoint-in-time snapshotとして保持し、変更していない。

## Patterns & Systemic Issues

- Visual stateがdomain stateを兼ね、ARIA/state tokenが後付けになる。Calendar、nav、form errorで同じ傾向。
- Full data取得をshared cacheで包み、cache missのquery/payload最小化が後回しになる。cache availabilityがperformance correctnessを左右する。
- Shared componentがstate modelだけでなく最大density presentationまで固定し、fallbackでinstance数に比例してDOM/interactionが増える。
- Reduced motion、focus-visible、error semanticsが画面別classに分散し、共通Acceptance Contractになっていない。

## Positive Findings

- Daily Storyとcontextual detailはServer Componentを維持し、page全体のclient化を避けている。
- valid date/performance contextはserver boundaryで厳密に検証し、invalidをfail closedする。
- Global NavigationはHeadless UIによりDialog/Menuのkeyboard foundationを確保した。
- AttendanceControlはpending競合防止、`aria-busy`、status、refresh後focus restorationを丁寧に実装した。
- `Promise.all`、selected=today skip、selected month reuse、Next batch early stop、shared tag cacheなど、現read model内の局所最適化は存在する。
- Typecheck / lintがcleanで、detector上のAI slopはcanonical font false positiveのみ。

**Final result: blocked**
