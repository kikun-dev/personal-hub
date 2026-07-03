"use client";

import type { CreateReleaseBonusVideoInput } from "@/types/release";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { FormBonusVideo } from "@/components/admin/release/releaseFormShared";

type ReleaseBonusVideosSectionProps = {
  bonusVideos: FormBonusVideo[];
  errors: Record<string, string>;
  addBonusVideo: () => void;
  updateBonusVideo: (
    key: string,
    field: keyof CreateReleaseBonusVideoInput,
    value: string
  ) => void;
  removeBonusVideo: (key: string) => void;
};

export function ReleaseBonusVideosSection({
  bonusVideos,
  errors,
  addBonusVideo,
  updateBonusVideo,
  removeBonusVideo,
}: ReleaseBonusVideosSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground/70">特典映像</label>
        <Button type="button" variant="ghost" onClick={addBonusVideo}>
          + 特典映像を追加
        </Button>
      </div>
      <div className="space-y-3">
        {bonusVideos.map((bonus, index) => (
          <div
            key={bonus._key}
            className="space-y-2 rounded-lg border border-foreground/10 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-foreground/50">#{index + 1}</p>
              <button
                type="button"
                className="text-xs text-red-500 hover:underline"
                onClick={() => removeBonusVideo(bonus._key)}
              >
                削除
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                id={`bonus-edition-${bonus._key}`}
                label="版種*"
                value={bonus.edition}
                onChange={(e) =>
                  updateBonusVideo(bonus._key, "edition", e.target.value)
                }
                error={errors[`bonusVideos.${index}.edition`]}
              />
              <Input
                id={`bonus-title-${bonus._key}`}
                label="タイトル*"
                value={bonus.title}
                onChange={(e) =>
                  updateBonusVideo(bonus._key, "title", e.target.value)
                }
                error={errors[`bonusVideos.${index}.title`]}
              />
            </div>
            <Textarea
              id={`bonus-description-${bonus._key}`}
              label="説明"
              value={bonus.description}
              onChange={(e) =>
                updateBonusVideo(bonus._key, "description", e.target.value)
              }
              error={errors[`bonusVideos.${index}.description`]}
            />
          </div>
        ))}
        {bonusVideos.length === 0 && (
          <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
            特典映像は未設定です
          </p>
        )}
      </div>
    </div>
  );
}
