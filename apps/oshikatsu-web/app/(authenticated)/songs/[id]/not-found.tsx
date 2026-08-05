import { PendingLink } from "@/components/ui/PendingLink";
import { standaloneTargetClass } from "@/components/ui/interactionStyles";
import { APP_ROUTES } from "@/lib/routes";

// 楽曲詳細取得時にnotFound()が呼ばれた場合の表示（page.tsx:21、対象楽曲が存在しない）。
// error.tsxとは異なり例外ではなく通常のページ状態として理解可能にするため、
// role="alert"は付けずheadingと説明文のみで構成する（#486 Decision 6）。
export default function SongNotFound() {
  return (
    <div className="rounded-lg border border-border-subtle p-6 text-center">
      <h1 className="text-base font-semibold text-foreground">楽曲が見つかりません</h1>
      <p className="mt-1 text-sm text-foreground-secondary">
        指定された楽曲は存在しないか、削除された可能性があります。
      </p>
      <div className="mt-4">
        <PendingLink
          href={APP_ROUTES.songs}
          feedback="global"
          className={`text-sm text-foreground-secondary hover:text-foreground ${standaloneTargetClass}`}
        >
          ← 楽曲一覧
        </PendingLink>
      </div>
    </div>
  );
}
