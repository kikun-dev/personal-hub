"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { APP_ROUTES } from "@/lib/routes";

type SongDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// 楽曲詳細の読み込み/描画で例外が出ても、ページ全体を 500 にせず
// 回復可能な表示に留める（原因調査用に digest をログへ残す）。
export default function SongDetailError({ error, reset }: SongDetailErrorProps) {
  useEffect(() => {
    // クライアントコンソールへの露出を最小化し、サーバーログ突合用の digest のみ記録する
    console.error("song detail render error", { digest: error.digest });
  }, [error]);

  return (
    <div className="space-y-4">
      <Link
        href={APP_ROUTES.songs}
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        ← 楽曲一覧
      </Link>
      <div className="rounded-lg border border-foreground/10 p-6 text-center">
        <p className="text-sm text-foreground">楽曲情報の読み込みに失敗しました。</p>
        <p className="mt-1 text-xs text-foreground/50">
          時間をおいて再度お試しください。
        </p>
        <div className="mt-4">
          <Button onClick={reset}>再試行</Button>
        </div>
      </div>
    </div>
  );
}
