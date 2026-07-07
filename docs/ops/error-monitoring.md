# エラー監視（Vercel 標準ログ）

Vercel にデプロイしている `oshikatsu-web` / `household-web` の本番エラーに気づき、後から
原因を追えるようにするための最小運用手順。Issue #324 の Decision として、まずは新規依存を
追加せず Vercel の Runtime Logs / Observability を使う。

## 方針

- **採用するもの**: Vercel Runtime Logs / Observability / 標準通知
- **採用しないもの**: Sentry、APM、分散トレーシング、クライアント行動計測
- **目的**: まず本番の 500 / Server Action 失敗 / 未処理例外に気づき、該当 request のログを追えること
- **エスカレーション**: ログ保持期間や通知精度が不足したら、Sentry または Vercel Observability Plus / Alerts を別 Issue で検討する

参考:

- Vercel Runtime Logs: https://vercel.com/docs/logs/runtime
- Vercel Observability: https://vercel.com/docs/observability
- Vercel Notifications: https://vercel.com/docs/notifications

## 初回設定

### 1. Vercel 通知を有効にする

Vercel Dashboard → Team Settings → My Notifications で、少なくとも次を有効にする。

- Deployment Failures
- Critical notifications
- Alerts / Error Anomalies（利用できるプランの場合）

スマホで気づけるよう、Vercel の push 通知も有効にする。Vercel の Error anomaly alert は
Pro + Observability Plus 前提のため、無料枠では必須条件にしない。

### 2. Runtime Logs を確認できることを確認する

Vercel Dashboard → 対象 Project → Logs を開き、Production の runtime logs が見えることを確認する。

確認時の基本フィルタ:

| 目的 | フィルタ |
|---|---|
| 本番だけ見る | Environment: `production` |
| サーバーエラーを見る | Status Code: `500-599` |
| アプリ側ログを見る | Level: `error` / `fatal` |
| 自分の操作だけ追う | Logs from your browser |
| 該当画面だけ追う | Route または Request Path |

## 障害時の確認手順

1. Vercel Dashboard → 対象 Project → Observability で error rate が上がっている route を見る。
2. 該当 route から Logs に移動する、または Logs を直接開いて `production` + `500-599` で絞る。
3. log detail の Request Id / Route / Function / Outgoing Requests / Log Messages を確認する。
4. Next.js の error boundary 由来なら、`root render error` や `song detail render error` の `digest` を見る。
5. Server Action 由来なら、`createSongAction: repository error` などの action 名と Supabase error code を見る。
6. DB / Storage / Auth 起因が疑わしい場合は Supabase 側の Logs と同時刻で突き合わせる。
7. 影響範囲が不明な場合は、対象操作を止めてバックアップの存在を確認してから修正する。

## ログに出してよい情報

- action / route / domain 名
- Next.js error digest
- Supabase error `code`
- Supabase error `message` / `details` / `hint`（入力値や secret を含まない範囲）
- UUID などの内部 ID

## ログに出さない情報

- DB 接続文字列、service role key、API key、cookie、JWT
- ユーザーのメールアドレス、氏名、メモ本文、参戦記録の自由記述
- アップロードファイルの中身
- form input 全体、request body 全体

`console.error` を追加するときは、入力値を丸ごと渡さず、調査に必要な code / digest / id のみに絞る。
監視は best-effort とし、監視ツールの未設定や障害でアプリの処理を失敗させない。

## 現在のアプリ側ログ

| アプリ | 場所 | ログ内容 |
|---|---|---|
| `oshikatsu-web` | `app/error.tsx` | root render error の digest |
| `oshikatsu-web` | `app/(authenticated)/songs/[id]/error.tsx` | song detail render error の digest |
| `oshikatsu-web` | 楽曲 / メンバー作成更新 Server Action | action 名 + RepositoryError の message / Supabase error code 等 |

## 制限

- Vercel Runtime Logs の保持期間はプランに依存する。無料枠では長期保管を前提にしない。
- Vercel 標準通知だけでは、低頻度の runtime 500 を即時に検知できない可能性がある。
- 取りこぼしが問題になったら、Sentry 無料枠か Vercel Observability Plus / Alerts の導入を検討する。
