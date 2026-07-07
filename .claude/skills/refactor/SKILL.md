---
name: refactor
description: リファクタリングIssueを起点に、振る舞い不変の構造改善を実装してPRを作成する。「#123のリファクタをやって」「リファクタ実装して」「共通化して」などで使う。対象把握→振る舞い不変の規律で実装→機械的な前後比較→typecheck/lint→PRまでを一括で行う。
argument-hint: "<Issue番号 | リファクタ内容>"
---

# リファクタリング実装

`rules/ai-collaboration.md` の原則「リファクタは原則として振る舞い不変」を実装手順に具体化したもの。
Claude / Codex 共用スキル。

## 手順

### 1. 対象の把握

- Issue 番号があれば `gh issue view <N>` で本文・スコープ（対象/非対象）・完了条件を読む
- 発端が監査（`docs/advisor/`）や負債表（`docs/orbit-roadmap.md`）ならそちらも読む
- 対象ファイルと**全参照箇所**を洗い出す（`grep -rn` で import・呼び出し・コメント内の言及まで。
  リネーム/移動の消し忘れは参照 grep が0件になることで検知する）
- 従うべき既存パターンを特定する（例: mapper 分割は `songMapper.ts`、フォームのセクション分割は
  `components/admin/song/`、宣言表化は `lib/revalidateOrbit.ts`、トランザクション RPC は migration 059/060）

### 2. ブランチ作成

- `git fetch origin` 後、`origin/main` から `refactor/<Issue番号>-<kebab-slug>` を作成する

### 3. 実装の規律（振る舞い不変の定義）

以下を**一切変えない**。変えざるを得ないと分かった時点で実装を止め、Issue に戻して設計を確定する
（`rules/ai-collaboration.md`「振る舞い変更がある場合はIssueへ戻す」）:

- 公開関数・コンポーネントの名前とシグネチャ（呼び出し側を壊さない。移動時は import 更新で追随）
- レンダリング結果（JSX の要素・属性・クラス名・文言・**表示順**）
- エラーメッセージの文言、バリデーションの判定
- キャッシュキー・キャッシュタグ・失効の集合
- DB アクセスの意味（クエリの内容、null/空文字の扱い、トランザクション境界）

加えて:

- 1変更1責務。純粋な移動と内容の変更を同じ差分に混ぜない（混ざる場合は分割を提案する）
- コメントはロジックと一緒に移動して残す。既存のコメント密度・日本語スタイルに合わせる
- `rules/architecture.md`（依存方向）/ `rules/implementation.md`（`any` 禁止・型明示）を守る

### 4. 振る舞い不変の検証（できる限り機械的に）

「目視で同じ」ではなく、旧実装（`git show HEAD:<path>`）との機械的な比較を工夫する。実例:

- JSX の移動: label / placeholder / id / className 等の**属性集合を抽出・sort して diff**
- タグ・キー類: 抽出した集合（出現回数込み）の前後 diff
- 集合的な振る舞い（失効タグ等）: 前後の集合を導出して比較する使い捨てスクリプト
- 比較できない部分は、何を目視で確認したかを PR に正直に書く（実施していない検証を書かない）

### 5. 検証と PR

- `pnpm --filter oshikatsu-web typecheck && pnpm --filter oshikatsu-web lint`
  （`packages/supabase` を触った場合は household-web でも typecheck / lint）
- PR は `pr` スキルの手順に従う（`Closes #N`、Test Plan に検証方法と結果、
  Review Notes に「判断で変えた点」があれば明記）

### 6. ドキュメント反映

- `docs/orbit-roadmap.md` の負債表に該当行があれば、既存様式（`~~取り消し線~~` + `✅ Issue #N で対応済み`）で更新し PR に含める

## 完了条件

- 振る舞い不変が機械的検証または明示的な目視項目で担保されている
- typecheck / lint 通過、参照の消し忘れゼロ（旧名の grep が0件）
- PR が作成され、負債表の該当行が更新されている（該当する場合）
