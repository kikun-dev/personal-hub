import { SongsLoadingSkeleton } from "@/components/songs/SongsLoadingSkeleton";

// SongsPageはh1描画前にgetSongsPageDataをawaitするため、初回server fetch中は
// Suspenseではカバーできないroute全体の空白が生じる（#486 Evidence）。この
// loading.tsxはNext.jsのfile-based fallbackとして、その空白の間だけ表示される。
export default function Loading() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">楽曲</h1>
      <SongsLoadingSkeleton />
    </div>
  );
}
