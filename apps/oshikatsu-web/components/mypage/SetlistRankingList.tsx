"use client";

import { useState } from "react";
import { PendingLink } from "@/components/ui/PendingLink";
import { Badge } from "@/components/ui/Badge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import type { SetlistRankingEntry } from "@/usecases/getSetlistCount";
import { SONG_LABEL_BADGE_COLOR, formatSongLabel } from "@/types/song";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type SetlistRankingListProps = {
  entries: SetlistRankingEntry[];
};

// ランキング1行。曲名クリックで楽曲詳細へ、展開ボタンで公演内訳をインライン表示する
// （Issue #249 Design notes 論点3: A + B の併用のうち、ランキング行での軽い確認）。
export function SetlistRankingList({ entries }: SetlistRankingListProps) {
  // 展開は1行ずつ（複数同時展開も許容する軽量な仕様。UI上の複雑さを避けるため
  // ここでは「開いている行のID集合」を持ち、複数展開を許可する）
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        該当する楽曲がありません
      </p>
    );
  }

  const toggleExpanded = (songId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  };

  return (
    <ol className="space-y-2">
      {entries.map((entry, index) => {
        const isExpanded = expandedIds.has(entry.song.id);
        const labelText = formatSongLabel(
          entry.song.label,
          entry.song.generation,
          entry.song.groupNameJa
        );

        return (
          <li
            key={entry.song.id}
            className="rounded-lg border border-foreground/10 bg-background"
          >
            <div className="flex items-center gap-3 p-4">
              <span className="w-8 shrink-0 text-right text-sm font-semibold text-foreground/40">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                {/* 楽曲詳細の ListBackButton（songs/[id]/page.tsx）は fallbackHref を
                    APP_ROUTES.songs 固定で持つため、ここも同じ値を渡して router.back()
                    でランキングへ戻れるようにする（listBackNavigation の一致判定） */}
                <PendingLink
                  href={`/songs/${entry.song.id}`}
                  className="text-sm font-medium text-foreground hover:underline"
                  listBackFallbackHref={APP_ROUTES.songs}
                >
                  {entry.song.title}
                </PendingLink>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {entry.song.groupNameJa && (
                    <span className="text-xs text-foreground/50">
                      {entry.song.groupNameJa}
                    </span>
                  )}
                  {labelText && (
                    <Badge label={labelText} color={SONG_LABEL_BADGE_COLOR} />
                  )}
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground">
                {entry.count}回
              </span>
              <button
                type="button"
                onClick={() => toggleExpanded(entry.song.id)}
                aria-expanded={isExpanded}
                className="shrink-0 rounded-lg border border-foreground/10 px-2 py-1 text-xs text-foreground/60 hover:bg-foreground/5"
              >
                {isExpanded ? "閉じる" : "内訳"}
              </button>
            </div>
            {isExpanded && (
              <ul className="space-y-1 border-t border-foreground/10 p-4 pt-3">
                {entry.encounters.map((encounter, encounterIndex) => (
                  <li
                    // 1公演で同じ曲を複数回披露している場合 performanceId が重複しうるため index を含める
                    key={`${encounter.performanceId}-${encounterIndex}`}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <span className="text-foreground/50">
                      {encounter.performanceDate
                        ? formatDate(encounter.performanceDate)
                        : "日付未定"}
                    </span>
                    <PendingLink
                      href={`/lives/${encounter.liveId}`}
                      className="text-foreground hover:underline"
                      listBackFallbackHref={APP_ROUTES.mypageSetlist}
                    >
                      {encounter.liveName}
                    </PendingLink>
                    {encounter.groups.map((g) => (
                      <GroupBadge key={g.id} groupName={g.nameJa} groupColor={g.color} />
                    ))}
                    <AttendedTypeBadge attendedType={encounter.attendedType} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
