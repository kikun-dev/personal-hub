---
name: adr
description: 設計判断をADR（Architecture Decision Record）としてdocs/decisions/に記録する。「ADR化して」「ADRに残して」「設計判断を記録して」などで使う。採番→既存フォーマット準拠の作成→PROJECT.mdのADR表更新まで一括で行う。
argument-hint: "<記録したい設計判断>"
---

# ADR 起票

設計判断を `docs/decisions/` に ADR として記録し、`docs/ai/PROJECT.md` の ADR 表を更新する。

## 昇格基準の確認（作成前に必ず）

`rules/process.md` の昇格基準に照らし、ADR にすべき判断か確認する:

- 今後も参照される可能性が高い決定（長期影響がある）
- 迷いが再発しそうな決定
- 「なぜそうしたか」を残さないと将来破綻しそうな決定

該当しない場合（一時的な判断・Issue 内で完結する判断）は、Issue の Decision 欄への記録を提案して止める。

## 手順

### 1. 採番とタイトル

- `docs/decisions/` の既存ファイルから次番号を決める（4桁ゼロ埋め: `0001`〜）
- ファイル名: `NNNN-<kebab-case-slug>.md`（例: `0006-orbit-read-cache-strategy.md`）

### 2. 本文の作成

既存 ADR（0006, 0007 が良い見本）のフォーマットに従う:

```markdown
# ADR NNNN: <タイトル>

## Status
Accepted

## Context（背景）

<なぜこの判断が必要になったか。課題・制約・検討のきっかけ>

## Decision（決定）

<何をどう決めたか。番号付きサブセクションで具体的に>

## Consequences（結果・影響）

### 良い点

- <この決定で得られるもの>

### 悪い点

- <受け入れたトレードオフ・制約・将来の負債>

## Notes

- <導入 Issue / PR、関連 ADR、補足>
```

書き方の注意:

- Context には「他の選択肢ではなくなぜこれか」が分かる程度の比較を含める
  （Issue の Design notes に Options / Trade-offs があればそこから要約し、Issue を Notes で参照する）
- Consequences の「悪い点」を省略しない（トレードオフのない決定は ADR にする必要がない）
- 日本語ベースで記載する（`rules/implementation.md`）

### 3. 関連ドキュメントの更新

- `docs/ai/PROJECT.md` の「決定済みの設計判断（ADR）」表に行を追加する
- 決定の発端になった Issue があれば、Issue の Decision 欄に「ADR NNNN に昇格」と追記する（`gh issue edit` または コメント）
- 決定が既存の運用メモ（`docs/ai/PROJECT.md` の各運用メモ等）と矛盾する場合は、そちらも更新する

## 完了条件

- `docs/decisions/NNNN-*.md` が既存フォーマット準拠で作成されている
- `docs/ai/PROJECT.md` の ADR 表が更新されている
- 発端 Issue との相互参照が取れている（該当する場合）
