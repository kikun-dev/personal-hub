"use client";

import type { ReleaseOption } from "@/types/release";
import { RELEASE_TYPE_LABELS } from "@/types/release";
import type { CreateSongReleaseLinkInput } from "@/types/song";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatMemberCountSummary } from "@/lib/memberCountSummary";
import type { FormReleaseLink } from "@/components/admin/song/songFormShared";

type SongReleaseLinksSectionProps = {
  releaseLinks: FormReleaseLink[];
  releases: ReleaseOption[];
  releaseMap: Map<string, ReleaseOption>;
  releaseQueries: Record<string, string>;
  errors: Record<string, string>;
  addReleaseLink: () => void;
  updateReleaseLink: (
    key: string,
    field: keyof CreateSongReleaseLinkInput,
    value: string
  ) => void;
  removeReleaseLink: (key: string) => void;
  updateReleaseQuery: (key: string, query: string) => void;
};

export function SongReleaseLinksSection({
  releaseLinks,
  releases,
  releaseMap,
  releaseQueries,
  errors,
  addReleaseLink,
  updateReleaseLink,
  removeReleaseLink,
  updateReleaseQuery,
}: SongReleaseLinksSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/70">紐づけリリース*</label>
        <Button type="button" variant="ghost" onClick={addReleaseLink}>
          + リリースを追加
        </Button>
      </div>
      {errors.releaseLinks && <p className="mb-2 text-xs text-red-500">{errors.releaseLinks}</p>}
      <div className="space-y-2">
        {releaseLinks.map((link, index) => {
          const selectedRelease = releaseMap.get(link.releaseId);
          const query = (releaseQueries[link._key] ?? "").trim().toLowerCase();
          const candidates = releases
            .filter((release) => release.title.toLowerCase().includes(query))
            .slice(0, 50);
          const selectableReleases = selectedRelease && !candidates.some((release) => release.id === selectedRelease.id)
            ? [selectedRelease, ...candidates]
            : candidates;

          return (
            <div key={link._key} className="rounded-lg border border-foreground/10 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
                <Input
                  id={`release-search-${link._key}`}
                  label="タイトル検索"
                  value={releaseQueries[link._key] ?? selectedRelease?.title ?? ""}
                  onChange={(e) => updateReleaseQuery(link._key, e.target.value)}
                />

                <div>
                  <label className="mb-1 block text-xs text-foreground/60">リリース</label>
                  <select
                    value={link.releaseId}
                    onChange={(e) => {
                      const nextReleaseId = e.target.value;
                      updateReleaseLink(link._key, "releaseId", nextReleaseId);
                      if (nextReleaseId) {
                        updateReleaseQuery(link._key, releaseMap.get(nextReleaseId)?.title ?? "");
                      }
                    }}
                    className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
                  >
                    <option value="">選択してください</option>
                    {selectableReleases.map((release) => (
                      <option key={release.id} value={release.id}>
                        {release.title} ({RELEASE_TYPE_LABELS[release.releaseType]})
                      </option>
                    ))}
                  </select>
                  {errors[`releaseLinks.${index}.releaseId`] && (
                    <p className="mt-1 text-xs text-red-500">{errors[`releaseLinks.${index}.releaseId`]}</p>
                  )}
                </div>

                <Input
                  id={`trackNumber-${link._key}`}
                  label="曲順"
                  type="number"
                  min={1}
                  placeholder="空欄で末尾"
                  value={link.trackNumber}
                  onChange={(e) => updateReleaseLink(link._key, "trackNumber", e.target.value)}
                  error={errors[`releaseLinks.${index}.trackNumber`]}
                />

                <button
                  type="button"
                  onClick={() => removeReleaseLink(link._key)}
                  className="rounded p-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  削除
                </button>
              </div>
              {selectedRelease && (
                <p className="mt-2 text-xs text-foreground/50">
                  参加メンバー{" "}
                  {formatMemberCountSummary(
                    selectedRelease.participantMemberGenerations
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
