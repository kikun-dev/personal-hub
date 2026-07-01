import type { Song, SongVideo } from "@/types/song";
import { Fragment } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormationDisplay } from "@/components/songs/FormationDisplay";
import { formatDate } from "@/lib/formatters";
import { formatReleaseTypeLabel, RELEASE_TYPE_LABELS } from "@/types/release";
import {
  SONG_LABEL_BADGE_COLOR,
  formatSongLabel,
  formatSongVideoTypeLabel,
} from "@/types/song";

const CREDIT_LABELS: Record<string, string> = {
  lyrics: "作詞",
  music: "作曲",
  arrangement: "編曲",
  choreography: "振付",
};

export function SongDetail({ song }: { song: Song }) {
  const labelText = formatSongLabel(song.label, song.generation, song.groupNameJa);
  const releaseLabelText = song.representativeReleaseType
    ? formatReleaseTypeLabel(song.representativeReleaseType, song.representativeNumbering)
    : null;
  const displayVideos = song.videos
    .map((video) => ({
      video,
      label: formatSongVideoTypeLabel(video.type, song.groupNameJa),
    }))
    .filter((item): item is { video: SongVideo; label: string } =>
      Boolean(item.label)
    );
  const creditsByRole = new Map<string, string[]>();
  for (const credit of song.credits) {
    const list = creditsByRole.get(credit.role) ?? [];
    list.push(credit.personName);
    creditsByRole.set(credit.role, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{song.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {song.groupNameJa && (
            <span className="text-sm text-foreground/50">{song.groupNameJa}</span>
          )}
          {releaseLabelText && (
            <span className="text-sm text-foreground/50">{releaseLabelText}</span>
          )}
          {labelText && <Badge label={labelText} color={SONG_LABEL_BADGE_COLOR} />}
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">リリース紐づけ</h2>
        <ul className="space-y-2 text-sm">
          {song.releases.map((release) => (
            <li key={`${release.releaseId}-${release.trackNumber}`} className="rounded-lg border border-foreground/10 p-3">
              <p className="font-medium text-foreground">
                <Link href={`/releases/${release.releaseId}`} className="hover:underline">
                  {release.releaseTitle}
                </Link>
                （{RELEASE_TYPE_LABELS[release.releaseType]}）
              </p>
              <p className="mt-1 text-xs text-foreground/60">
                {release.trackNumber}曲目
                {release.releaseDate && ` / ${formatDate(release.releaseDate)}`}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">楽曲情報</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {Array.from(creditsByRole.entries()).map(([role, names]) => (
            <Fragment key={role}>
              <dt className="text-foreground/50">{CREDIT_LABELS[role] ?? role}</dt>
              <dd className="text-foreground">{names.join(" / ")}</dd>
            </Fragment>
          ))}
        </dl>
      </Card>

      {song.mv && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">MV</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-foreground/50">リンク</dt>
            <dd className="break-all text-blue-500">
              <a href={song.mv.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {song.mv.url}
              </a>
            </dd>
            {song.mv.directorName && (
              <>
                <dt className="text-foreground/50">監督</dt>
                <dd className="text-foreground">{song.mv.directorName}</dd>
              </>
            )}
            {song.mv.location && (
              <>
                <dt className="text-foreground/50">ロケ地</dt>
                <dd className="text-foreground">{song.mv.location}</dd>
              </>
            )}
            {song.mv.publishedOn && (
              <>
                <dt className="text-foreground/50">配信日</dt>
                <dd className="text-foreground">{formatDate(song.mv.publishedOn)}</dd>
              </>
            )}
            {song.mv.memo && (
              <>
                <dt className="text-foreground/50">メモ</dt>
                <dd className="whitespace-pre-wrap text-foreground">{song.mv.memo}</dd>
              </>
            )}
          </dl>
        </Card>
      )}

      {displayVideos.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">関連動画</h2>
          <div className="space-y-4">
            {displayVideos.map(({ video, label }) => (
              <dl
                key={video.type}
                className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-foreground/10 pb-4 text-sm last:border-0 last:pb-0"
              >
                <dt className="text-foreground/50">種別</dt>
                <dd className="text-foreground">{label}</dd>
                <dt className="text-foreground/50">リンク</dt>
                <dd className="break-all text-blue-500">
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {video.url}
                  </a>
                </dd>
                {video.publishedOn && (
                  <>
                    <dt className="text-foreground/50">配信日</dt>
                    <dd className="text-foreground">{formatDate(video.publishedOn)}</dd>
                  </>
                )}
                {video.memo && (
                  <>
                    <dt className="text-foreground/50">メモ</dt>
                    <dd className="whitespace-pre-wrap text-foreground">{video.memo}</dd>
                  </>
                )}
              </dl>
            ))}
          </div>
        </Card>
      )}

      {song.costumes.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">衣装</h2>
          <ul className="space-y-2 text-sm">
            {song.costumes.map((costume) => (
              <li key={costume.id} className="rounded-lg border border-foreground/10 p-3">
                <p className="text-foreground">担当: {costume.stylistName}</p>
                <p className="mt-1 break-all text-xs text-foreground/60">画像: {costume.imagePath}</p>
                {costume.note && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-foreground/60">{costume.note}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <FormationDisplay rows={song.formationRows} />
    </div>
  );
}
