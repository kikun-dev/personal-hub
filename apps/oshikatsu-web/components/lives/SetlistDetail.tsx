import { Fragment } from "react";
import type {
  Live,
  LivePerformance,
  SetlistItem,
  SetlistSection,
} from "@/types/live";
import {
  PERFORMANCE_STYLE_LABELS,
  SETLIST_ITEM_TYPE_LABELS,
  SETLIST_SECTION_LABELS,
} from "@/types/live";
import { PendingLink } from "@/components/ui/PendingLink";
import { SetlistFormationDisplay } from "@/components/lives/SetlistFormationDisplay";
import { groupBySection, numberSetlistItems } from "@/usecases/setlistNumbering";
import type { SetlistSectionGroup } from "@/usecases/setlistNumbering";
import { formatMonthDayWithWeekday } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type SetlistDetailProps = {
  live: Pick<Live, "id" | "name" | "liveType">;
  performance: LivePerformance;
  // 参照は admin / viewer 共通のため出し分けはしないが、セトリ0件時の空状態にのみ
  // admin 向けの予告テキストを出す（編集導線自体はPR2まで出さない）
  isAdmin: boolean;
};

// LiveDetail.tsx の formatScheduleTime/formatScheduleLine と同じ方針（種別ごとの
// 時間ラベル出し分け）をこのページ用に簡略化して持つ（両者を跨ぐ共通化は本PRの
// スコープ外とし、参照ビュー側で完結させる）
function formatScheduleLabel(
  liveType: Live["liveType"],
  performance: LivePerformance
): string {
  const date = performance.performanceDate
    ? formatMonthDayWithWeekday(performance.performanceDate)
    : "日付未定";

  const { doorsOpenAt, startsAt } = performance;
  let time: string | null = null;
  if (liveType === "online") {
    time = startsAt ? `配信 ${startsAt}` : null;
  } else if (liveType === "festival") {
    time = startsAt ? `出演 ${startsAt}` : null;
  } else if (doorsOpenAt && startsAt) {
    time = `開場 ${doorsOpenAt} / 開演 ${startsAt}`;
  } else if (startsAt) {
    time = `開演 ${startsAt}`;
  } else if (doorsOpenAt) {
    time = `開場 ${doorsOpenAt}`;
  }

  return time ? `${date} ${time}` : date;
}

function shouldShowSectionHeading(groups: readonly SetlistSectionGroup[]): boolean {
  // 「本編のみ」の場合だけ見出しを出さない。単一セクションでもそれがアンコール系なら
  // 見出しを出す（本編なしでENだけのセトリで区分が分かるように）。
  // 複数セクションがある場合は本編にも「本編」見出しを出し、切り替わりを明確にする
  return groups.length > 1 || (groups.length === 1 && groups[0].section !== "main");
}

function SectionHeading({ section }: { section: SetlistSection }) {
  return (
    <span className="rounded bg-foreground/10 px-2 py-0.5 text-xs font-semibold text-foreground/70">
      {SETLIST_SECTION_LABELS[section]}
    </span>
  );
}

function PerformanceStyleBadges({ item }: { item: SetlistItem }) {
  if (item.performanceStyles.length === 0) {
    return null;
  }
  return (
    <>
      {item.performanceStyles.map((style) => (
        <span
          key={style}
          className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] text-foreground/60"
        >
          {PERFORMANCE_STYLE_LABELS[style]}
        </span>
      ))}
    </>
  );
}

function SongItemRow({
  item,
  numberLabel,
}: {
  item: SetlistItem;
  numberLabel: string | null;
}) {
  const center = item.members.find((member) => member.isCenter);
  const title = item.trackTitle ?? item.songTitle ?? "（曲名未設定）";

  return (
    <li className="flex gap-3 rounded-lg border border-foreground/10 p-3">
      <span className="w-8 shrink-0 text-right text-sm font-semibold text-foreground/40">
        {numberLabel}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.trackId ? (
            <PendingLink
              href={`${APP_ROUTES.songs}/${item.trackId}`}
              className="font-medium text-blue-500 hover:underline"
            >
              {title}
            </PendingLink>
          ) : (
            <span className="font-medium text-foreground">{title}</span>
          )}
          <PerformanceStyleBadges item={item} />
        </div>

        {center && (
          <p className="text-xs text-foreground/70">C: {center.memberNameJa}</p>
        )}

        {item.members.length > 0 && (
          <details className="text-xs text-foreground/70">
            <summary className="cursor-pointer text-foreground/50">
              披露メンバー {item.members.length}人
            </summary>
            <p className="mt-1">
              {item.members
                .map((member) =>
                  member.isCenter
                    ? `${member.memberNameJa}（C）`
                    : member.memberNameJa
                )
                .join("、")}
            </p>
          </details>
        )}

        <SetlistFormationDisplay rows={item.formationRows} members={item.members} />

        {item.costumeNote && (
          <p className="text-xs text-foreground/70">衣装: {item.costumeNote}</p>
        )}
        {item.note && <p className="text-xs text-foreground/70">メモ: {item.note}</p>}
      </div>
    </li>
  );
}

function NonSongItemRow({ item }: { item: SetlistItem }) {
  return (
    <li className="flex gap-3 rounded-lg border border-foreground/10 p-3">
      <span className="w-8 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/70">
          {SETLIST_ITEM_TYPE_LABELS[item.itemType]}
        </span>
        {item.costumeNote && (
          <p className="text-xs text-foreground/70">衣装: {item.costumeNote}</p>
        )}
        {item.note && <p className="text-xs text-foreground/70">メモ: {item.note}</p>}
      </div>
    </li>
  );
}

export function SetlistDetail({ live, performance, isAdmin }: SetlistDetailProps) {
  const numbered = numberSetlistItems(performance.setlistItems);
  const groups = groupBySection(numbered);
  const showHeading = shouldShowSectionHeading(groups);
  const editHref = `${APP_ROUTES.lives}/${live.id}/performances/${performance.id}/setlist/edit`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <PendingLink
          href={`${APP_ROUTES.lives}/${live.id}`}
          feedback="global"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← {live.name}
        </PendingLink>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-foreground">セットリスト</h1>
          {isAdmin && (
            <PendingLink
              href={editHref}
              className="text-sm text-blue-500 hover:underline"
            >
              編集
            </PendingLink>
          )}
        </div>
        <p className="text-sm text-foreground/70">
          {formatScheduleLabel(live.liveType, performance)}
          {performance.venueName ? ` ${performance.venueName}` : ""}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 p-6 text-center text-sm text-foreground/60">
          <p>この公演のセットリストはまだ登録されていません。</p>
          {isAdmin && (
            <PendingLink
              href={editHref}
              className="mt-1 inline-block text-xs text-blue-500 hover:underline"
            >
              セットリストを編集
            </PendingLink>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, groupIndex) => (
            <section key={`${group.section}-${groupIndex}`} className="space-y-2">
              {showHeading && <SectionHeading section={group.section} />}
              <ol className="space-y-2">
                {group.items.map(({ item, numberLabel }, index) => (
                  <Fragment key={`${group.section}-${groupIndex}-${index}`}>
                    {item.itemType === "song" ? (
                      <SongItemRow item={item} numberLabel={numberLabel} />
                    ) : (
                      <NonSongItemRow item={item} />
                    )}
                  </Fragment>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
