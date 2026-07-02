"use client";

import type { CreateReleaseTrackLinkInput } from "@/types/release";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type {
  FormTrackLink,
  ReleaseTrackOption,
} from "@/components/admin/release/releaseFormShared";

type ReleaseTracksSectionProps = {
  trackLinks: FormTrackLink[];
  tracks: ReleaseTrackOption[];
  trackTitleById: Map<string, string>;
  trackQueries: Record<string, string>;
  errors: Record<string, string>;
  addTrackLink: () => void;
  updateTrackLink: (
    key: string,
    field: keyof CreateReleaseTrackLinkInput,
    value: string
  ) => void;
  removeTrackLink: (key: string) => void;
  updateTrackQuery: (key: string, query: string) => void;
};

export function ReleaseTracksSection({
  trackLinks,
  tracks,
  trackTitleById,
  trackQueries,
  errors,
  addTrackLink,
  updateTrackLink,
  removeTrackLink,
  updateTrackQuery,
}: ReleaseTracksSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/70">収録曲（楽曲）</label>
        <Button type="button" variant="ghost" onClick={addTrackLink}>
          + 楽曲を追加
        </Button>
      </div>
      {errors.trackLinks && <p className="mb-2 text-xs text-red-500">{errors.trackLinks}</p>}
      <div className="space-y-2">
        {trackLinks.map((trackLink, index) => {
          const query = (trackQueries[trackLink._key] ?? "").trim().toLowerCase();
          const selectedTrack = trackLink.trackId
            ? tracks.find((track) => track.id === trackLink.trackId) ?? null
            : null;
          const candidates = tracks
            .filter((track) => track.title.toLowerCase().includes(query))
            .slice(0, 50);
          const selectableTracks = selectedTrack && !candidates.some((track) => track.id === selectedTrack.id)
            ? [selectedTrack, ...candidates]
            : candidates;

          return (
            <div key={trackLink._key} className="rounded-lg border border-foreground/10 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
                <Input
                  id={`track-search-${trackLink._key}`}
                  label="タイトル検索"
                  value={trackQueries[trackLink._key] ?? selectedTrack?.title ?? ""}
                  onChange={(e) => updateTrackQuery(trackLink._key, e.target.value)}
                />

                <div>
                  <label className="mb-1 block text-xs text-foreground/60">楽曲</label>
                  <select
                    value={trackLink.trackId}
                    onChange={(e) => {
                      const nextTrackId = e.target.value;
                      updateTrackLink(trackLink._key, "trackId", nextTrackId);
                      if (nextTrackId) {
                        updateTrackQuery(trackLink._key, trackTitleById.get(nextTrackId) ?? "");
                      }
                    }}
                    className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
                  >
                    <option value="">選択してください</option>
                    {selectableTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.title}
                      </option>
                    ))}
                  </select>
                  {errors[`trackLinks.${index}.trackId`] && (
                    <p className="mt-1 text-xs text-red-500">{errors[`trackLinks.${index}.trackId`]}</p>
                  )}
                </div>

                <Input
                  id={`track-number-${trackLink._key}`}
                  label="曲順"
                  type="number"
                  min={1}
                  value={trackLink.trackNumber}
                  onChange={(e) => updateTrackLink(trackLink._key, "trackNumber", e.target.value)}
                  error={errors[`trackLinks.${index}.trackNumber`]}
                />

                <button
                  type="button"
                  onClick={() => removeTrackLink(trackLink._key)}
                  className="rounded p-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  削除
                </button>
              </div>
            </div>
          );
        })}
        {trackLinks.length === 0 && (
          <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
            楽曲は未設定です
          </p>
        )}
      </div>
    </div>
  );
}
