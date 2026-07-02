"use client";

import type { CreateSongCostumeInput } from "@/types/song";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { FormCostume } from "@/components/admin/song/songFormShared";

type SongCostumesSectionProps = {
  costumes: FormCostume[];
  errors: Record<string, string>;
  addCostume: () => void;
  updateCostume: (
    key: string,
    field: keyof CreateSongCostumeInput,
    value: string
  ) => void;
  removeCostume: (key: string) => void;
};

export function SongCostumesSection({
  costumes,
  errors,
  addCostume,
  updateCostume,
  removeCostume,
}: SongCostumesSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/70">衣装</label>
        <Button type="button" variant="ghost" onClick={addCostume}>
          + 衣装を追加
        </Button>
      </div>
      <div className="space-y-3">
        {costumes.map((costume, index) => (
          <div key={costume._key} className="rounded-lg border border-foreground/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-foreground/50">#{index + 1}</p>
              <button
                type="button"
                className="text-xs text-red-500 hover:underline"
                onClick={() => removeCostume(costume._key)}
              >
                削除
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                id={`costume-stylist-${costume._key}`}
                label="衣装担当*"
                list="person-suggestions-costume"
                value={costume.stylistName}
                onChange={(e) => updateCostume(costume._key, "stylistName", e.target.value)}
                error={errors[`costumes.${index}.stylistName`]}
              />
              <Input
                id={`costume-image-${costume._key}`}
                label="画像（Storage path: costumes/...）*"
                value={costume.imagePath}
                onChange={(e) => updateCostume(costume._key, "imagePath", e.target.value)}
                error={errors[`costumes.${index}.imagePath`]}
              />
            </div>
            <Textarea
              id={`costume-note-${costume._key}`}
              label="メモ"
              value={costume.note}
              onChange={(e) => updateCostume(costume._key, "note", e.target.value)}
              error={errors[`costumes.${index}.note`]}
            />
          </div>
        ))}
        {costumes.length === 0 && (
          <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
            衣装は未設定です
          </p>
        )}
      </div>
    </div>
  );
}
