import { PendingLink } from "@/components/ui/PendingLink";
import { getLivesPageData } from "@/usecases/readOrbitData";
import { LIVE_FORMAT_LABELS, LIVE_TYPE_LABELS } from "@/types/live";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

function formatDateRange(
  firstDate: string | null,
  lastDate: string | null
): string {
  if (!firstDate) return "日程未定";
  if (!lastDate || firstDate === lastDate) return formatDate(firstDate);
  return `${formatDate(firstDate)} 〜 ${formatDate(lastDate)}`;
}

export default async function LivesPage() {
  const lives = await getLivesPageData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">ライブ</h1>
        <span className="text-sm text-foreground/50">{lives.length}件</span>
      </div>

      {lives.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          ライブが登録されていません
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lives.map((live) => (
            <PendingLink
              key={live.id}
              href={`/lives/${live.id}`}
              className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
              listBackFallbackHref={APP_ROUTES.lives}
            >
              <p className="text-sm font-medium text-foreground">{live.name}</p>
              <p className="mt-1 text-xs text-foreground/50">
                {LIVE_FORMAT_LABELS[live.format]} / {LIVE_TYPE_LABELS[live.liveType]}
                {live.performerGroupNames.length > 0
                  ? ` / ${live.performerGroupNames.join("、")}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-foreground/50">
                {formatDateRange(live.firstDate, live.lastDate)}
                {live.performanceCount > 0 ? `（${live.performanceCount}公演）` : ""}
              </p>
            </PendingLink>
          ))}
        </div>
      )}
    </div>
  );
}
