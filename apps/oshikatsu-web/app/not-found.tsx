import { PendingLink } from "@/components/ui/PendingLink";
import { standaloneTargetClass } from "@/components/ui/interactionStyles";

// 未定義ルートへのアクセス時に Next.js デフォルトの 404 画面ではなく、
// 既存のトーンに合わせた案内を表示する。
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border-subtle p-6 text-center">
        <p className="text-sm text-foreground">ページが見つかりません。</p>
        <p className="mt-1 text-xs text-foreground-secondary">
          URLが間違っているか、ページが削除された可能性があります。
        </p>
        <div className="mt-4">
          {/* この 404 は root layout 直下で、NavigationProgressProvider を持つ
              (authenticated) layout の外側にある。feedback="global" にすると
              startProgress が no-op fallback になり、inline state も立たないため
              pending 表示が一切出ない。ここは inline feedback を使う（#482）。 */}
          <PendingLink
            href="/"
            feedback="inline"
            className={`text-sm text-foreground-secondary hover:text-foreground ${standaloneTargetClass}`}
          >
            ← トップへ戻る
          </PendingLink>
        </div>
      </div>
    </div>
  );
}
