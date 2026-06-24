import { SongBrowser } from "@/components/songs/SongBrowser";
import { getSongsPageData } from "@/usecases/readOrbitData";

type SongsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SongsPage({ searchParams }: SongsPageProps) {
  const params = await searchParams;
  const initialGroupId = params.groupId ?? "";

  // 絞り込みはクライアント側で行うため、常に全件取得する
  const { songs, groups, songSections } = await getSongsPageData({});

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">楽曲</h1>
      <SongBrowser
        groups={groups}
        initialGroupId={initialGroupId}
        songs={songs}
        songSections={songSections}
      />
    </div>
  );
}
