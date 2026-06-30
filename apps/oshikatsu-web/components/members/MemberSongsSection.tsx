"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Song } from "@/types/song";
import { SONG_LABELS, SONG_LABEL_LABELS } from "@/types/song";

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
        <h2 className="text-sm font-medium text-foreground/70">参加楽曲</h2>
        <span className="text-sm font-medium text-foreground">
          {songs.length}曲
        </span>
      </div>

      {breakdown.length > 0 && (
        <p className="text-xs text-foreground/60">{breakdown.join("、")}</p>
      )}
      {centerCount > 0 && (
        <p className="mt-1 text-xs font-medium text-amber-600">
          ★ センター {centerCount}曲
        </p>
      )}

      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="mt-3 text-xs text-foreground/60 hover:text-foreground"
      >
        {isExpanded ? "閉じる ▲" : "全曲を表示 ▼"}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {songs.map((song) => {
            const isCenter = centerTrackIdSet.has(song.id);
            return (
              <Link
                key={song.id}
                href={`/songs/${song.id}`}
                className="block rounded-lg border border-foreground/10 px-3 py-2 text-sm text-foreground hover:bg-foreground/5"
              >
                <p className="font-medium">
                  {isCenter && <span className="text-amber-600">★ </span>}
                  {song.title}
                </p>
                {song.groupNameJa && (
                  <p className="mt-1 text-xs text-foreground/50">
                    {song.groupNameJa}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
