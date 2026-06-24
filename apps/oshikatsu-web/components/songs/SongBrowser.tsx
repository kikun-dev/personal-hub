"use client";

import { useMemo, useState } from "react";
import { SongGrid } from "@/components/songs/SongGrid";
import { SongSectionList } from "@/components/songs/SongSectionList";
import type { SongListItem, SongSection } from "@/types/song";
import {
  filterSongSectionsByTitle,
  filterSongsByTitle,
} from "@/usecases/songSearch";

type SongBrowserProps = {
  isGroupFiltered: boolean;
  songs: SongListItem[];
  songSections: SongSection[];
};

export function SongBrowser({
  isGroupFiltered,
  songs,
  songSections,
}: SongBrowserProps) {
  const [query, setQuery] = useState("");

  // 件数表示は常にフラットなフィルタ結果から算出する
  const filteredSongs = useMemo(
    () => filterSongsByTitle(songs, query),
    [songs, query]
  );
  // セクション表示はグループ未絞り込み時のみ使うため、その場合だけ計算する
  const filteredSections = useMemo(
    () =>
      isGroupFiltered ? [] : filterSongSectionsByTitle(songSections, query),
    [isGroupFiltered, songSections, query]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="タイトルで検索"
          aria-label="楽曲タイトルで検索"
          className="w-full max-w-xs rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
        />
        <span className="shrink-0 text-sm text-foreground/50">
          {filteredSongs.length}曲
        </span>
      </div>
      {isGroupFiltered ? (
        <SongGrid songs={filteredSongs} />
      ) : (
        <SongSectionList sections={filteredSections} />
      )}
    </div>
  );
}
