import { ReleaseCard } from "@/components/releases/ReleaseCard";
import type { ReleaseListItem } from "@/types/release";

type ReleaseGridProps = {
  releases: ReleaseListItem[];
  showGroupName?: boolean;
};

export function ReleaseGrid({ releases, showGroupName = true }: ReleaseGridProps) {
  if (releases.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        リリースが見つかりません
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          showGroupName={showGroupName}
        />
      ))}
    </div>
  );
}
