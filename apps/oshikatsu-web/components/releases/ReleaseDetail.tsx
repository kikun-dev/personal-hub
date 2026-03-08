import Image from "next/image";
import Link from "next/link";
import type { Release } from "@/types/release";
import { RELEASE_TYPE_LABELS } from "@/types/release";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/formatters";
import { resolveReleaseImageSrc } from "@/lib/releaseImage";

type ReleaseDetailProps = {
  release: Release;
};

export function ReleaseDetail({ release }: ReleaseDetailProps) {
  const artworkSrc = resolveReleaseImageSrc(release.artworkPath);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">{release.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <GroupBadge
            groupName={release.groupNameJa}
            groupColor={release.groupColor}
          />
          <span className="rounded-full border border-foreground/10 px-2 py-0.5 text-xs text-foreground/70">
            {RELEASE_TYPE_LABELS[release.releaseType]}
          </span>
          {release.numbering && (
            <span className="rounded-full border border-foreground/10 px-2 py-0.5 text-xs text-foreground/70">
              No.{release.numbering}
            </span>
          )}
        </div>
      </div>

      {artworkSrc && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">曲目アートワーク</h2>
          <Image
            src={artworkSrc}
            alt={`${release.title} artwork`}
            width={640}
            height={640}
            className="h-auto w-full rounded-lg border border-foreground/10 object-cover"
          />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">基本情報</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-foreground/50">リリースタイプ</dt>
          <dd className="text-foreground">{RELEASE_TYPE_LABELS[release.releaseType]}</dd>
          {release.releaseDate && (
            <>
              <dt className="text-foreground/50">リリース日</dt>
              <dd className="text-foreground">{formatDate(release.releaseDate)}</dd>
            </>
          )}
        </dl>
      </Card>

      {release.tracks.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">曲目</h2>
          <ol className="space-y-2">
            {release.tracks.map((track) => (
              <li key={track.trackId} className="rounded-lg border border-foreground/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground/60">{track.trackNumber}.</span>
                  <Link
                    href={`/songs/${track.trackId}`}
                    className="flex-1 text-sm text-foreground hover:underline"
                  >
                    {track.trackTitle}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {release.bonusVideos.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">特典映像</h2>
          <ul className="space-y-2">
            {release.bonusVideos.map((bonus) => (
              <li key={bonus.id} className="rounded-lg border border-foreground/10 p-3 text-sm">
                <p className="font-medium text-foreground">{bonus.edition}: {bonus.title}</p>
                {bonus.description && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-foreground/60">{bonus.description}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {release.participantMemberNames.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">参加メンバー</h2>
          <p className="text-sm text-foreground">{release.participantMemberNames.join(" / ")}</p>
        </Card>
      )}
    </div>
  );
}
