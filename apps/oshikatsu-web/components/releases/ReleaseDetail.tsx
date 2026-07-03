import Image from "next/image";
import Link from "next/link";
import type { Release } from "@/types/release";
import { RELEASE_TYPE_LABELS, ordinalNumber } from "@/types/release";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/formatters";
import { resolveReleaseImageSrc } from "@/lib/releaseImage";
import { formatMemberCountSummary } from "@/lib/memberCountSummary";
import {
  SONG_LABEL_BADGE_COLOR,
  formatSongLabel,
  formatSongVideoTypeLabel,
} from "@/types/song";

type ReleaseDetailProps = {
  release: Release;
};

type TrackVideoBadge = {
  label: string;
  color: string;
};

const VIDEO_BADGE_COLORS = {
  mv: "#EF4444",
  dancePractice: "#0EA5E9",
  call: "#10B981",
} as const;

function getTrackVideoBadges(track: Release["tracks"][number]): TrackVideoBadge[] {
  const badges: TrackVideoBadge[] = [];

  if (track.hasMv) {
    badges.push({ label: "MV", color: VIDEO_BADGE_COLORS.mv });
  }

  if (track.hasDancePracticeVideo) {
    const label = formatSongVideoTypeLabel("dance_practice", track.groupNameJa);
    if (label) {
      badges.push({ label, color: VIDEO_BADGE_COLORS.dancePractice });
    }
  }

  if (track.hasCallVideo) {
    badges.push({ label: "コール", color: VIDEO_BADGE_COLORS.call });
  }

  return badges;
}

export function ReleaseDetail({ release }: ReleaseDetailProps) {
  const artworkSrc = resolveReleaseImageSrc(release.artworkPath);
  const bonusByEdition = new Map<string, typeof release.bonusVideos>();
  for (const bonus of release.bonusVideos) {
    const list = bonusByEdition.get(bonus.edition) ?? [];
    list.push(bonus);
    bonusByEdition.set(bonus.edition, list);
  }

  // 休業中は参加メンバー表示・人数から除外する（参加登録自体は保持）
  const hiatusMemberIds = new Set(
    release.memberPositions
      .filter((position) => position.isHiatus)
      .map((position) => position.memberId)
  );
  const activeParticipants = release.participantMemberIds
    .map((memberId, index) => ({
      memberId,
      name: release.participantMemberNames[index],
      generation: release.participantMemberGenerations[index],
    }))
    .filter((participant) => !hiatusMemberIds.has(participant.memberId));
  const activeParticipantNames = activeParticipants.map(
    (participant) => participant.name
  );
  const activeParticipantGenerations = activeParticipants.map(
    (participant) => participant.generation
  );

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
              {ordinalNumber(release.numbering)}
            </span>
          )}
        </div>
      </div>

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

      {activeParticipantNames.length > 0 && (
        <Card>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground/70">参加メンバー</h2>
            <span className="text-xs text-foreground/60">
              {formatMemberCountSummary(activeParticipantGenerations)}
            </span>
          </div>
          <p className="text-sm text-foreground">{activeParticipantNames.join(" / ")}</p>
        </Card>
      )}

      {release.tracks.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">収録曲</h2>
          <ol className="space-y-2">
            {release.tracks.map((track) => {
              const labelText = formatSongLabel(
                track.label,
                track.generation,
                track.groupNameJa
              );
              const videoBadges = getTrackVideoBadges(track);

              return (
                <li key={track.trackId} className="rounded-lg border border-foreground/10 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-foreground/60">{track.trackNumber}.</span>
                    <Link
                      href={`/songs/${track.trackId}`}
                      className="min-w-0 flex-1 basis-40 text-sm text-foreground hover:underline"
                    >
                      {track.trackTitle}
                    </Link>
                    {labelText && <Badge label={labelText} color={SONG_LABEL_BADGE_COLOR} />}
                    {videoBadges.map((badge) => (
                      <Badge
                        key={`${track.trackId}-${badge.label}`}
                        label={badge.label}
                        color={badge.color}
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {release.bonusVideos.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">特典映像</h2>
          <div className="space-y-4">
            {Array.from(bonusByEdition.entries()).map(([edition, items]) => (
              <section key={edition} className="space-y-2">
                <p className="text-xs font-medium text-foreground/60">{edition}</p>
                <ul className="space-y-2">
                  {items.map((bonus) => (
                    <li key={bonus.id} className="rounded-lg border border-foreground/10 p-3 text-sm">
                      <p className="font-medium text-foreground">{bonus.title}</p>
                      {bonus.description && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-foreground/60">{bonus.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>
      )}

      {artworkSrc && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">収録曲アートワーク</h2>
          <Image
            src={artworkSrc}
            alt={`${release.title} artwork`}
            width={640}
            height={640}
            className="h-auto w-full rounded-lg border border-foreground/10 object-cover"
          />
          {release.artworkPersonName && (
            <p className="mt-2 text-xs text-foreground/60">
              担当: {release.artworkPersonName}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
