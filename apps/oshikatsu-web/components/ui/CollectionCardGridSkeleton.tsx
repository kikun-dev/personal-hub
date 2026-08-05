// Song/Lives双方のcard gridが共有する実markup（`grid gap-3 sm:grid-cols-2
// lg:grid-cols-3` + `rounded-lg border border-border-subtle bg-background p-4`の
// card）はdomain差がなく完全に同一のため、一目的のpresentation componentとして
// 共有する（#486 Decision 4）。card内部のtext行数・幅はSongCard/LiveCard実物の
// おおよその見た目（タイトル1行+補足2行）に寄せたplaceholderで、実データを模した
// ものではない。filter rowはSong/Liveで要素数・種類が大きく異なるため、ここには
// 含めない（各route側で個別に持つ）。
// Server Componentからも使えるよう"use client"は付けない。
type CollectionCardGridSkeletonProps = {
  count: number;
};

export function CollectionCardGridSkeleton({ count }: CollectionCardGridSkeletonProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="space-y-2 rounded-lg border border-border-subtle bg-background p-4"
        >
          <div className="h-4 w-3/4 rounded bg-surface-subtle" />
          <div className="h-3 w-1/2 rounded bg-surface-subtle" />
          <div className="h-3 w-2/3 rounded bg-surface-subtle" />
        </div>
      ))}
    </div>
  );
}
