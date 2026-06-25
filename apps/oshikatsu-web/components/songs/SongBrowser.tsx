"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SongGrid } from "@/components/songs/SongGrid";
import { SongSectionList } from "@/components/songs/SongSectionList";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import type { Group } from "@/types/group";
import type { SongListItem, SongSection } from "@/types/song";
import {
  filterSongSectionsByTitle,
  filterSongsByGroup,
  filterSongsByTitle,
} from "@/usecases/songSearch";

type SongBrowserProps = {
  groups: Group[];
  songs: SongListItem[];
  songSections: SongSection[];
};

export function SongBrowser({ groups, songs, songSections }: SongBrowserProps) {
  // 即時反映は local state、戻る/リロード等の URL 変化は useEffect で同期する
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get("groupId") ?? "";
  const [groupId, setGroupId] = useState(urlGroupId);
  // タイトル検索は URL 非同期の一時状態
  const [query, setQuery] = useState("");

  useEffect(() => {
    setGroupId(urlGroupId);
  }, [urlGroupId]);

  const isGroupFiltered = groupId !== "";

  // 件数表示・フラット表示用（グループ＋タイトルで絞り込む）
  const filteredSongs = useMemo(
    () => filterSongsByTitle(filterSongsByGroup(songs, groupId), query),
    [songs, groupId, query]
  );
  // セクション表示はグループ未選択時のみ使う
  const filteredSections = useMemo(
    () =>
      isGroupFiltered ? [] : filterSongSectionsByTitle(songSections, query),
    [isGroupFiltered, songSections, query]
  );

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    replaceListFilterParams({ groupId: nextGroupId });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={groupId}
          onChange={(event) => handleGroupChange(event.target.value)}
          aria-label="グループで絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全グループ</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.nameJa}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="タイトルで検索"
          aria-label="楽曲タイトルで検索"
          className="w-full max-w-xs rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
        />
        <span className="ml-auto shrink-0 text-sm text-foreground/50">
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
