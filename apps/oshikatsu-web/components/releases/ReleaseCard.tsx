import Link from "next/link";
import type { Release } from "@/types/release";
import { RELEASE_TYPE_LABELS } from "@/types/release";
import { formatDate } from "@/lib/formatters";

type ReleaseCardProps = {
  release: Release;
};

export function ReleaseCard({ release }: ReleaseCardProps) {
  return (
    <Link
      href={`/releases/${release.id}`}
      className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
    >
      <p className="text-sm font-medium text-foreground">{release.title}</p>
      <p className="mt-1 text-xs text-foreground/50">
        {release.groupNameJa} / {RELEASE_TYPE_LABELS[release.releaseType]}
        {release.numbering ? ` / ${release.numbering}` : ""}
      </p>
      <p className="mt-1 text-xs text-foreground/50">曲目: {release.tracks.length}曲</p>
      {release.releaseDate && (
        <p className="mt-1 text-xs text-foreground/50">{formatDate(release.releaseDate)}</p>
      )}
    </Link>
  );
}
