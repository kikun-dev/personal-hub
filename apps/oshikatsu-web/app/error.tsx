"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// ルート配下のレンダリングで例外が出ても、Next.js のデフォルト 500 画面ではなく
// 回復可能な表示に留める（原因調査用に digest をログへ残す）。
export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    // クライアントコンソールへの露出を最小化し、サーバーログ突合用の digest のみ記録する
    console.error("root render error", { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <Link
          href="/"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← トップへ戻る
        </Link>
        <div className="rounded-lg border border-foreground/10 p-6 text-center">
          <p className="text-sm text-foreground">
            ページの表示中に問題が発生しました。
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            時間をおいて再度お試しください。
          </p>
          <div className="mt-4">
            <Button onClick={reset}>再試行</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
