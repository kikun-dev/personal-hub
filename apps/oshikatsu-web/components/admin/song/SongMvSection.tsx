"use client";

import type { CreateSongMvInput } from "@/types/song";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type SongMvSectionProps = {
  mv: CreateSongMvInput;
  errors: Record<string, string>;
  isMvFormVisible: boolean;
  onShow: () => void;
  onClear: () => void;
  onChangeField: (field: keyof CreateSongMvInput, value: string) => void;
};

export function SongMvSection({
  mv,
  errors,
  isMvFormVisible,
  onShow,
  onClear,
  onChangeField,
}: SongMvSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/70">MV</label>
        {!isMvFormVisible ? (
          <Button type="button" variant="ghost" onClick={onShow}>
            + MVを追加
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onClear}>
            MVを削除
          </Button>
        )}
      </div>

      {isMvFormVisible ? (
        <div className="space-y-3 rounded-lg border border-foreground/10 p-4">
          <Input
            id="mv-url"
            label="MVリンク"
            value={mv.url}
            onChange={(e) => onChangeField("url", e.target.value)}
            error={errors["mv.url"]}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="mv-director"
              label="監督"
              list="person-suggestions-mv_director"
              value={mv.directorName}
              onChange={(e) => onChangeField("directorName", e.target.value)}
              error={errors["mv.directorName"]}
            />
            <Input
              id="mv-location"
              label="ロケ地"
              value={mv.location}
              onChange={(e) => onChangeField("location", e.target.value)}
              error={errors["mv.location"]}
            />
            <Input
              id="mv-published-on"
              label="配信日"
              type="date"
              value={mv.publishedOn}
              onChange={(e) => onChangeField("publishedOn", e.target.value)}
              error={errors["mv.publishedOn"]}
            />
          </div>
          <Textarea
            id="mv-memo"
            label="MVメモ"
            value={mv.memo}
            onChange={(e) => onChangeField("memo", e.target.value)}
            error={errors["mv.memo"]}
          />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
          MVは未設定です
        </p>
      )}
    </div>
  );
}
