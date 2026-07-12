---
name: Sakalog
description: "坂道グループの情報と推し活の記録を、毎日楽しく見返せる個人用アーカイブ。"
colors:
  background-light: "#FFFFFF"
  foreground-light: "#171717"
  background-dark: "#0A0A0A"
  foreground-dark: "#EDEDED"
  surface-hover-light: "#F3F3F3"
  surface-selected-light: "#E8E8E8"
  nogizaka: "#7B2D8E"
  nogizaka-soft: "#7B2D8E20"
  sakurazaka: "#E8518D"
  hinatazaka: "#54C3F1"
  keyakizaka: "#00843D"
  hiragana-keyakizaka: "#6DBE6E"
  birthday: "#D946EF"
  live: "#F97316"
  release: "#3B82F6"
  video: "#10B981"
  error: "#EF4444"
typography:
  headline:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.55
    letterSpacing: "normal"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.foreground-light}"
    textColor: "{colors.background-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  card-interactive:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-nogizaka:
    backgroundColor: "{colors.nogizaka-soft}"
    textColor: "{colors.nogizaka}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  navigation-active:
    backgroundColor: "{colors.surface-selected-light}"
    textColor: "{colors.foreground-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  calendar-day-selected:
    backgroundColor: "{colors.foreground-light}"
    textColor: "{colors.background-light}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    size: "24px"
---

# Design System: Sakalog

## Overview

**Creative North Star: "毎日ひらく、育っていく推し活アーカイブ"**

Sakalog は、今日の出来事を確認する軽さと、積み重なった思い出を読み返す親密さを同じ画面に置く。白黒の静かな土台に、グループやイベントを示す色が小さく現れ、情報量が増えても視線の順序を失わせない。

部品は親しみやすく軽快に扱える一方、形や状態表現は一貫させる。画面はモバイルからデスクトップまで最大幅 1024px の読みやすい中心領域を基本とし、カード一覧は 640px と 1024px を境に構造的に組み替える。動きは状態変化の説明に限り、装飾のための演出には使わない。

**Key Characteristics:**

- 毎日開いても疲れない、白黒中心の静かな情報面
- グループ色とイベント色による、意味のある小さな彩り
- 角をわずかに丸めた、親しみやすく軽快な操作部品
- 境界線を基本に、重要な操作面だけへ控えめな奥行き
- 14px を中心にした、情報密度の高い一貫した文字階層

## Colors

ニュートラルな背景と文字を主役にし、色は所属、種別、状態を伝えるときだけ使う。

### Primary

- **乃木坂パープル** (`#7B2D8E`): 乃木坂46の所属表示、グループ見出し、関連データの識別に使う。主要操作の装飾色には転用しない。
- **櫻坂ピンク** (`#E8518D`): 櫻坂46の所属表示と関連データだけに使う。
- **日向坂スカイ** (`#54C3F1`): 日向坂46の所属表示と関連データだけに使う。

### Secondary

- **欅坂グリーン** (`#00843D`): 欅坂46の履歴と関連データに使う。
- **ひらがなけやきグリーン** (`#6DBE6E`): けやき坂46の履歴と関連データに使う。

### Tertiary

- **誕生日マゼンタ** (`#D946EF`): 誕生日イベント。
- **ライブオレンジ** (`#F97316`): ライブイベント。
- **リリースブルー** (`#3B82F6`): リリースイベント。
- **動画グリーン** (`#10B981`): MV・関連動画イベント。
- **エラーレッド** (`#EF4444`): 入力エラーと破壊的操作。通常の強調には使わない。

### Neutral

- **ライト背景** (`#FFFFFF`) と **ライト文字** (`#171717`): 通常の明色テーマ。文字色の透明度を 70%、60%、50%、40% と段階的に下げ、階層をつくる。
- **ダーク背景** (`#0A0A0A`) と **ダーク文字** (`#EDEDED`): OS設定に従う暗色テーマ。グレーを別に足さず、同じ透明度の体系を維持する。
- **ライトホバー面** (`#F3F3F3`) と **ライト選択面** (`#E8E8E8`): ホバー、選択、境界の強弱に使う。常設の装飾背景として広げない。

### Named Rules

**The Meaningful Color Rule.** 色は所属、イベント種別、エラー、選択状態のいずれかを示さなければならない。意味のない彩色は禁止する。

**The Group Ownership Rule.** グループ色は対応するグループの情報だけが所有する。主要ボタンや汎用ナビゲーションのブランド装飾には流用しない。

## Typography

**Display Font:** Arial（Helvetica、sans-serif フォールバック）
**Body Font:** Arial（Helvetica、sans-serif フォールバック）
**Label/Mono Font:** Geist Mono（ui-monospace、monospace フォールバック）

**Character:** 単一のサンセリフを中心に、情報の種類ではなくサイズとウェイトで階層をつくる。ロゴは画像資産として扱い、ロゴの書体をUIラベルへ模倣しない。

### Hierarchy

- **Headline** (700、20px、1.4): ページ名と詳細画面の主題。1画面に原則1つだけ置く。
- **Title** (700、18px、1.55): 月表示や独立した重要タイトル。
- **Body** (400、14px、1.43): ナビゲーション、本文、フォーム、一覧の標準。長文は 65–75ch を上限にする。
- **Label** (500、12px、1.33): バッジ、補助情報、カレンダー。重要な本文をこのサイズへ押し込まない。
- **Mono** (400、14px、1.43): WikiのコードとMarkdown編集だけに限定する。

### Named Rules

**The Compact Clarity Rule.** 14pxを標準に密度を保つ代わりに、主要本文のコントラストは WCAG 2.2 AA を下回らせない。

**The One-Family Rule.** プロダクトUIへ装飾用ディスプレイ書体を追加しない。親しみやすさは色、余白、言葉でつくる。

## Elevation

通常の面は境界線と淡い背景差で整理する。重要な操作面には控えめな奥行きを許可するが、常設カードをすべて浮かせない。候補リストには中程度の影、モーダルとモバイルドロワーには強い影を使い、前後関係を即座に伝える。

### Shadow Vocabulary

- **Interactive Lift** (`0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)`): コンボボックス候補など、現在の面より前へ出る操作面。
- **Overlay Lift** (`0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)`): モーダルとモバイルドロワーだけ。

### Named Rules

**The Earned Lift Rule.** 影は階層または操作上の重要度を伝える要素だけが使える。通常カードの反復へ影を付けない。

**The One Edge Rule.** 広い影と装飾的な1px境界線を同じ要素へ重ねない。境界か奥行きのどちらか一方で面を定義する。

## Components

### Buttons

- **Shape:** 親しみやすい小さな丸み（8px）。タグ以外をピル形状にしない。
- **Primary:** 文字色と背景色を反転し、14px・500、上下10px・左右16px。画面の主要操作だけに使う。
- **Hover / Focus:** ホバーは同色の90%。フォーカスは背景文字色20%の2pxリング。色変化は150msを基本とし、無効時は不透明度50%と禁止カーソルを併用する。
- **Secondary / Ghost:** Secondary は10%境界、Ghost は境界なし。どちらもホバー面は文字色5%。

### Chips

- **Style:** グループ色を12.5%の淡い背景へ使い、文字は元のグループ色。12px・500、上下2px・左右10px、完全なピル形状。
- **State:** チップは所属や種別の表示を優先する。操作可能なフィルタでは選択状態を背景だけでなく文字の太さでも示す。

### Cards / Containers

- **Corner Style:** 小さく一貫した丸み（8px）。モーダルだけ12pxを許可する。
- **Background:** テーマの背景色と同じ面。ホバー時だけ5%の文字色を重ねる。
- **Shadow Strategy:** 通常カードは影なし。重要な操作面だけ `Interactive Lift` を使う。
- **Border:** 文字色10%の1px境界。影を使う面では装飾的な境界を外す。
- **Internal Padding:** 標準16px。密な一覧では12px、独立した空状態では24pxまで。

### Inputs / Fields

- **Style:** 8pxの丸み、文字色10%の1px境界、背景色と同じ面、上下8px・左右12px、14px本文。
- **Focus:** 既定の境界に加え、文字色20%の2pxリングを表示する。フォーカスを色だけで表現しない。
- **Error / Disabled:** エラーは赤い境界と説明文を併用する。無効状態は不透明度とカーソルを変え、操作不能であることを視覚と挙動の両方で示す。

### Navigation

- **Style:** 14pxの通常文字を基本に、非選択は文字色60–70%、選択は通常文字色と500ウェイトで示す。サイドナビの選択面は文字色10%。
- **Responsive behavior:** 768px未満ではヘッダーナビを右側ドロワーへ移し、背景タップ、Esc、フォーカストラップ、スクロールロックを維持する。
- **Motion:** ドロワーは200msのease-out。reduced motionでは移動を除き、即時切替または短いクロスフェードにする。

### Calendar Day

選択日は24pxの円で文字色と背景色を反転する。今日の日付は1pxリング、イベントは最大3個の色ドットで示す。色ドットだけに依存せず、選択後のイベント一覧で種別ラベルと名称を必ず表示する。

## Do's and Don'ts

### Do:

- **Do** 白黒のニュートラルを画面の大半に使い、グループ色とイベント色を意味のある小領域へ限定する。
- **Do** 8pxの角丸、14px本文、16pxカード余白を共通語彙として再利用する。
- **Do** 今日の出来事、今後の予定、過去の記録を近い導線でつなぎ、「毎日ひらく、育っていく推し活アーカイブ」を実感できる構成にする。
- **Do** ホバー、フォーカス、選択、無効、読み込み、エラーの各状態を実装し、動きは状態変化を伝える用途に限定する。
- **Do** OSのダークモードとreduced motionを尊重し、WCAG 2.2 AA相当のコントラストとキーボード操作を維持する。

### Don't:

- **Don't** 「装飾を重ねて情報が騒がしくなったファンサイト」のような見せ方にする。色、バッジ、カード、アイコンを意味なく増やさない。
- **Don't** 「目的のない動きや過剰な演出」を加える。ページ読み込みの連続アニメーション、バウンス、常時点滅は禁止する。
- **Don't** グループ色を汎用ボタンや無関係な画面の装飾へ流用する。
- **Don't** 通常カードへ境界線と広いぼかし影を同時に付ける。カードの角丸は16pxを超えさせない。
- **Don't** 小さく薄い文字だけで重要情報を伝える。色だけでイベント種別、選択状態、エラーを区別しない。
