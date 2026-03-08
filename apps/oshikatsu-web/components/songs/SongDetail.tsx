import type { Song } from "@/types/song";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { FormationDisplay } from "@/components/songs/FormationDisplay";
import { formatDate } from "@/lib/formatters";
import { RELEASE_TYPE_LABELS } from "@/types/release";

const CREDIT_LABELS: Record<string, string> = {
  lyrics: "作詞",
  music: "作曲",
  arrangement: "編曲",
  choreography: "振付",
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

export function SongDetail({ song }: { song: Song }) {
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
        {song.groupNames.length > 0 && (
          <p className="mt-1 text-sm text-foreground/50">{song.groupNames.join(" / ")}</p>
        )}
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
          {song.durationSeconds && (
            <>
              <dt className="text-foreground/50">時間</dt>
              <dd className="text-foreground">{formatDuration(song.durationSeconds)}</dd>
            </>
          )}
          {Array.from(creditsByRole.entries()).map(([role, names]) => (
            <>
              <dt key={`${role}-dt`} className="text-foreground/50">{CREDIT_LABELS[role] ?? role}</dt>
              <dd key={`${role}-dd`} className="text-foreground">{names.join(" / ")}</dd>
            </>
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
