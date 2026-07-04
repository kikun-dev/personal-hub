"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SongGrid } from "@/components/songs/SongGrid";
import { SongSectionList } from "@/components/songs/SongSectionList";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import type { Group } from "@/types/group";
import type { SongLabel, SongListItem, SongSection } from "@/types/song";
import { SONG_LABELS, SONG_LABEL_LABELS, isSongLabel } from "@/types/song";
import {
  filterSongSectionsByLabel,
  filterSongSectionsByTitle,
  filterSongsByGeneration,
  filterSongsByGroup,
  filterSongsByLabel,
  filterSongsByTitle,
} from "@/usecases/songSearch";

type SongBrowserProps = {
  groups: Group[];
  songs: SongListItem[];
  songSections: SongSection[];
};

function toLabel(value: string | null): SongLabel | "" {
  return value && isSongLabel(value) ? value : "";
}

export function SongBrowser({ groups, songs, songSections }: SongBrowserProps) {
  // 即時反映は local state、戻る/リロード等の URL 変化は useEffect で同期する
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get("groupId") ?? "";
  const urlLabel = toLabel(searchParams.get("label"));
  const urlGeneration = searchParams.get("generation") ?? "";
  const urlIncludeOther = searchParams.get("includeOther") === "1";
  const [groupId, setGroupId] = useState(urlGroupId);
  const [label, setLabel] = useState<SongLabel | "">(urlLabel);
  const [generation, setGeneration] = useState(urlGeneration);
  // 「その他」楽曲を含めるかどうか（既定off、#264）
  const [includeOther, setIncludeOther] = useState(urlIncludeOther);
  // タイトル検索は URL 非同期の一時状態
  const [query, setQuery] = useState("");

  useEffect(() => {
    setGroupId(urlGroupId);
  }, [urlGroupId]);
  useEffect(() => {
    setLabel(urlLabel);
  }, [urlLabel]);
  useEffect(() => {
    setGeneration(urlGeneration);
  }, [urlGeneration]);
  useEffect(() => {
    setIncludeOther(urlIncludeOther);
  }, [urlIncludeOther]);

  const isGroupFiltered = groupId !== "";
  // 期サブ絞り込みはグループ選択かつラベル=期別のときのみ
  const showGenerationFilter = isGroupFiltered && label === "generation";

  // 期の候補 = そのグループの期別曲に存在する期（昇順）
  const generationOptions = useMemo(() => {
    const present = new Set<string>();
    for (const song of songs) {
      if (
        song.groupId === groupId &&
        song.label === "generation" &&
        song.generation
      ) {
        present.add(song.generation);
      }
    }
    return Array.from(present).sort((a, b) => Number(a) - Number(b));
  }, [songs, groupId]);

  const effectiveGeneration = showGenerationFilter ? generation : "";

  // 全グループ表示かつトグルoffのときのみ「その他」楽曲を除外する。
  // 特定グループ選択時（その他を選択している場合を含む）は filterSongsByGroup が
  // 絞り込むのでそのまま扱う。
  const base = useMemo(
    () => (includeOther || isGroupFiltered ? songs : songs.filter((song) => !song.isCatchall)),
    [songs, includeOther, isGroupFiltered]
  );
  // セクション表示（全グループ時）も同様に、トグルoffのとき「その他」セクションを除外する
  const baseSections = useMemo(
    () =>
      includeOther
        ? songSections
        : songSections.filter((section) => !section.group?.isCatchall),
    [songSections, includeOther]
  );

  // 件数表示・フラット表示用（グループ＋ラベル＋期＋タイトル）
  const filteredSongs = useMemo(
    () =>
      filterSongsByTitle(
        filterSongsByGeneration(
          filterSongsByLabel(filterSongsByGroup(base, groupId), label),
          effectiveGeneration
        ),
        query
      ),
    [base, groupId, label, effectiveGeneration, query]
  );
  // セクション表示はグループ未選択時のみ（ラベル＋タイトル）
  const filteredSections = useMemo(
    () =>
      isGroupFiltered
        ? []
        : filterSongSectionsByTitle(
            filterSongSectionsByLabel(baseSections, label),
            query
          ),
    [isGroupFiltered, baseSections, label, query]
  );

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    setGeneration("");
    replaceListFilterParams({ groupId: nextGroupId, generation: "" });
  };

  const handleLabelChange = (nextLabel: SongLabel | "") => {
    setLabel(nextLabel);
    const nextGeneration = nextLabel === "generation" ? generation : "";
    setGeneration(nextGeneration);
    replaceListFilterParams({ label: nextLabel, generation: nextGeneration });
  };

  const handleGenerationChange = (nextGeneration: string) => {
    setGeneration(nextGeneration);
    replaceListFilterParams({ generation: nextGeneration });
  };

  const handleIncludeOtherChange = (nextIncludeOther: boolean) => {
    setIncludeOther(nextIncludeOther);
    replaceListFilterParams({ includeOther: nextIncludeOther ? "1" : "" });
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
        <select
          value={label}
          onChange={(event) =>
            handleLabelChange(event.target.value as SongLabel | "")
          }
          aria-label="ラベルで絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全ラベル</option>
          {SONG_LABELS.map((value) => (
            <option key={value} value={value}>
              {SONG_LABEL_LABELS[value]}
            </option>
          ))}
        </select>
        {showGenerationFilter && (
          <select
            value={generation}
            onChange={(event) => handleGenerationChange(event.target.value)}
            aria-label="期で絞り込み"
            className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">全期</option>
            {generationOptions.map((g) => (
              <option key={g} value={g}>
                {g}期
              </option>
            ))}
          </select>
        )}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="タイトルで検索"
          aria-label="楽曲タイトルで検索"
          className="w-full max-w-xs rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
        />
        <label className="flex items-center gap-1.5 text-sm text-foreground/70">
          <input
            type="checkbox"
            checked={includeOther}
            onChange={(event) => handleIncludeOtherChange(event.target.checked)}
          />
          その他も含む
        </label>
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
