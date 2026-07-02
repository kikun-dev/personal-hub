import Link from "next/link";

// 未定義ルートへのアクセス時に Next.js デフォルトの 404 画面ではなく、
// 既存のトーンに合わせた案内を表示する。
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-foreground/10 p-6 text-center">
        <p className="text-sm text-foreground">ページが見つかりません。</p>
        <p className="mt-1 text-xs text-foreground/50">
          URLが間違っているか、ページが削除された可能性があります。
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            ← トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
