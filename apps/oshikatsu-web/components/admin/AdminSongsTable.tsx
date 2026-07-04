"use client";

import type { Song } from "@/types/song";
import { TextLink } from "@/components/ui/TextLink";
import { SortableTh } from "@/components/ui/SortableTh";
import { formatDate } from "@/lib/formatters";
import { useTableSort, type SortableColumn } from "@/lib/useTableSort";

type SortKey = "title" | "group" | "releaseDate";

type AdminSongsTableProps = {
  songs: Song[];
};

const SONG_COLUMNS: readonly SortableColumn<Song, SortKey>[] = [
  { key: "title", label: "タイトル", sortValue: (s) => s.title },
  { key: "group", label: "グループ", sortValue: (s) => s.groupNameJa },
  { key: "releaseDate", label: "リリース日", sortValue: (s) => s.releaseDate },
];

function songTiebreak(a: Song, b: Song): number {
  return a.title.localeCompare(b.title, "ja");
}

export function AdminSongsTable({ songs }: AdminSongsTableProps) {
  const { sorted, sortKey, sortDir, handleSort, ariaSort } = useTableSort(
    songs,
    SONG_COLUMNS,
    { initialKey: "releaseDate", initialDir: "desc", tiebreak: songTiebreak }
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              {SONG_COLUMNS.map((col) => (
                <SortableTh
                  key={col.key}
                  label={col.label}
                  active={col.key === sortKey}
                  dir={sortDir}
                  ariaSort={ariaSort(col.key)}
                  onSort={() => handleSort(col.key)}
                />
              ))}
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((song) => (
              <tr key={song.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4 text-foreground">{song.title}</td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {song.groupNameJa || "—"}
                  </div>
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {song.releaseDate ? formatDate(song.releaseDate) : "—"}
                </td>
                <td className="py-2">
                  <TextLink
                    href={`/admin/songs/${song.id}/edit`}
                    feedback="global"
                    className="text-sm"
                  >
                    編集
                  </TextLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {songs.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          楽曲が登録されていません
        </p>
      )}
    </>
  );
}
