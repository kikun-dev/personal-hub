import type { Song } from "@/types/song";
import { Card } from "@/components/ui/Card";
import { FormationDisplay } from "@/components/songs/FormationDisplay";
import { formatDate } from "@/lib/formatters";

type SongDetailProps = {
  song: Song;
};

export function SongDetail({ song }: SongDetailProps) {
  const hasMetadata = song.lyricsBy || song.musicBy || song.releaseDate;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{song.title}</h1>
        {song.groupNames.length > 0 && (
          <p className="mt-1 text-sm text-foreground/50">
            {song.groupNames.join(" / ")}
          </p>
        )}
      </div>

      {/* メタデータ */}
      {hasMetadata && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">
            楽曲情報
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {song.lyricsBy && (
              <>
                <dt className="text-foreground/50">作詞</dt>
                <dd className="text-foreground">{song.lyricsBy}</dd>
              </>
            )}
            {song.musicBy && (
              <>
                <dt className="text-foreground/50">作曲</dt>
                <dd className="text-foreground">{song.musicBy}</dd>
              </>
            )}
            {song.releaseDate && (
              <>
                <dt className="text-foreground/50">リリース日</dt>
                <dd className="text-foreground">
                  {formatDate(song.releaseDate)}
                </dd>
              </>
            )}
          </dl>
        </Card>
      )}

      {/* フォーメーション */}
      <FormationDisplay members={song.members} />
    </div>
  );
}
