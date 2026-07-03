import { SongGrid } from "@/components/songs/SongGrid";
import type { SongListItem } from "@/types/song";

type SetlistUnencounteredListProps = {
  songs: SongListItem[];
};

// 未遭遇リスト（Issue #249）。楽曲一覧の SongGrid/SongCard をそのまま再利用し、
// 表示・戻り導線（listBackFallbackHref）ともに楽曲一覧と同じ操作感にする。
export function SetlistUnencounteredList({ songs }: SetlistUnencounteredListProps) {
  if (songs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        該当する楽曲がありません
      </p>
    );
  }

  return <SongGrid songs={songs} />;
}
