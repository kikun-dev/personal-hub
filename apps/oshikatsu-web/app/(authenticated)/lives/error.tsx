"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { PendingLink } from "@/components/ui/PendingLink";
import { standaloneTargetClass } from "@/components/ui/interactionStyles";
import { APP_ROUTES } from "@/lib/routes";

type LiveErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// ライブ一覧・詳細・セットリストの読み込み/描画で例外が出ても、ページ全体を 500
// にせず回復可能な表示に留める（原因調査用に digest をログへ残す）。
// Live subtree（list / [id] / [id]/performances/[performanceId]/setlist）は
// この1つの boundary で受け、route ごとに同じ boundary を複製しない（#486 Decision 5）。
export default function LiveError({ error, reset }: LiveErrorProps) {
  useEffect(() => {
    // クライアントコンソールへの露出を最小化し、サーバーログ突合用の digest のみ記録する
    console.error("live render error", { digest: error.digest });
  }, [error]);

  return (
    <div className="space-y-4">
      <PendingLink
        href={APP_ROUTES.lives}
        feedback="global"
        className={`text-sm text-foreground-secondary hover:text-foreground ${standaloneTargetClass}`}
      >
        ← ライブ一覧
      </PendingLink>
      <div className="rounded-lg border border-border-subtle p-6 text-center">
        <h1 className="text-base font-semibold text-foreground">ライブを表示できません</h1>
        {/* retry button / recovery link はalertの外に置く（Decision 5: interactive
            controlsをalert内へ入れない） */}
        <div role="alert" className="mt-1">
          <p className="text-sm text-foreground">ライブ情報の読み込みに失敗しました。</p>
          <p className="mt-1 text-xs text-foreground-secondary">
            時間をおいて再度お試しください。
          </p>
        </div>
        <div className="mt-4">
          <Button onClick={reset}>再試行</Button>
        </div>
      </div>
    </div>
  );
}
