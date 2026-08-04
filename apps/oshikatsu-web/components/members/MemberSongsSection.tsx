"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PendingLink } from "@/components/ui/PendingLink";
import { focusRingClass, standaloneTargetClass } from "@/components/ui/interactionStyles";
import type { Song } from "@/types/song";
import {
  SONG_LABELS,
  SONG_LABEL_LABELS,
  SONG_LABEL_BADGE_COLOR,
  formatSongLabel,
} from "@/types/song";
import { formatReleaseTypeLabel } from "@/types/release";

type MemberSongsSectionProps = {
  songs: Song[];
  centerTrackIds: string[];
};

// 参加楽曲は曲数が増えるため、初期はサマリ（合計＋ラベル別内訳＋センター曲数）のみ表示し、
// トグルで全曲一覧を展開する。
export function MemberSongsSection({
  songs,
  centerTrackIds,
}: MemberSongsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const regionId = useId();

  if (songs.length === 0) {
    return null;
  }

  const centerTrackIdSet = new Set(centerTrackIds);
  const centerCount = songs.filter((song) =>
    centerTrackIdSet.has(song.id)
  ).length;

  const countByLabel = new Map<string, number>();
  let noLabelCount = 0;
  for (const song of songs) {
    if (song.label) {
      countByLabel.set(song.label, (countByLabel.get(song.label) ?? 0) + 1);
    } else {
      noLabelCount += 1;
    }
  }

  const breakdown = SONG_LABELS.filter(
    (label) => (countByLabel.get(label) ?? 0) > 0
  ).map((label) => `${SONG_LABEL_LABELS[label]}${countByLabel.get(label)}曲`);
  if (noLabelCount > 0) {
    breakdown.push(`その他${noLabelCount}曲`);
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground-secondary">参加楽曲</h2>
        <span className="text-sm font-medium text-foreground">
          {songs.length}曲
        </span>
      </div>

      {breakdown.length > 0 && (
        <p className="text-xs text-foreground-secondary">{breakdown.join("、")}</p>
      )}
      {centerCount > 0 && (
        <p className="mt-1 text-xs font-medium text-amber-600">
          ★ センター {centerCount}曲
        </p>
      )}

      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls={regionId}
        className={`mt-3 text-xs text-foreground-secondary hover:text-foreground ${standaloneTargetClass} ${focusRingClass}`}
      >
        {isExpanded ? "閉じる ▲" : "全曲を表示 ▼"}
      </button>

      {/* aria-controls が常にDOM上の要素を指せるよう、展開領域自体は常にレンダリングし、
          中身（曲一覧）だけをisExpandedで出し分ける */}
      <div id={regionId} className="mt-2 space-y-2">
        {isExpanded &&
          songs.map((song) => {
            const isCenter = centerTrackIdSet.has(song.id);
            const releaseLabel = song.representativeReleaseType
              ? formatReleaseTypeLabel(
                  song.representativeReleaseType,
                  song.representativeNumbering
                )
              : null;
            const labelText = formatSongLabel(
              song.label,
              song.generation,
              song.groupNameJa
            );
            return (
              <PendingLink
                key={song.id}
                href={`/songs/${song.id}`}
                className="block rounded-lg border border-border-subtle px-3 py-2 text-sm text-foreground hover:bg-surface-subtle"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {isCenter && <span className="text-amber-600">★ </span>}
                    {song.title}
                  </p>
                  {labelText && (
                    <Badge label={labelText} color={SONG_LABEL_BADGE_COLOR} />
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground-secondary">
                  {releaseLabel && <span>{releaseLabel}</span>}
                  {song.groupNameJa && <span>{song.groupNameJa}</span>}
                </div>
              </PendingLink>
            );
          })}
      </div>
    </Card>
  );
}
