"use client";

import type { Group } from "@/types/group";
import { SONG_LABELS, SONG_LABEL_LABELS } from "@/types/song";
import { Input } from "@/components/ui/Input";

type SongBasicInfoSectionProps = {
  title: string;
  groupId: string;
  label: string;
  generation: string;
  groups: Group[];
  generationOptions: string[];
  errors: Record<string, string>;
  // 選択中グループが「その他」受け皿グループのとき、ラベル・期は非表示にする（#264）
  isCatchallGroup: boolean;
  onTitleChange: (value: string) => void;
  onGroupIdChange: (groupId: string) => void;
  onLabelChange: (label: string) => void;
  onGenerationChange: (generation: string) => void;
};

export function SongBasicInfoSection({
  title,
  groupId,
  label,
  generation,
  groups,
  generationOptions,
  errors,
  isCatchallGroup,
  onTitleChange,
  onGroupIdChange,
  onLabelChange,
  onGenerationChange,
}: SongBasicInfoSectionProps) {
  return (
    <>
      <Input
        id="title"
        label="タイトル*"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        error={errors.title}
      />

      <div>
        <label htmlFor="groupId" className="mb-1 block text-sm font-medium text-foreground/70">
          楽曲グループ*
        </label>
        <select
          id="groupId"
          value={groupId}
          onChange={(e) => onGroupIdChange(e.target.value)}
          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
        >
          <option value="">選択してください</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.nameJa}
            </option>
          ))}
        </select>
        {errors.groupId && (
          <p className="mt-1 text-xs text-red-500">{errors.groupId}</p>
        )}
      </div>

      {!isCatchallGroup && (
        <div>
          <label htmlFor="label" className="mb-1 block text-sm font-medium text-foreground/70">
            ラベル
          </label>
          <select
            id="label"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
          >
            <option value="">なし</option>
            {SONG_LABELS.map((songLabel) => (
              <option key={songLabel} value={songLabel}>
                {SONG_LABEL_LABELS[songLabel]}
              </option>
            ))}
          </select>
          {errors.label && (
            <p className="mt-1 text-xs text-red-500">{errors.label}</p>
          )}
        </div>
      )}

      {!isCatchallGroup && label === "generation" && (
        <div>
          <label htmlFor="generation" className="mb-1 block text-sm font-medium text-foreground/70">
            期
          </label>
          <select
            id="generation"
            value={generation}
            onChange={(e) => onGenerationChange(e.target.value)}
            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
          >
            <option value="">選択してください</option>
            {generationOptions.map((g) => (
              <option key={g} value={g}>
                {g}期
              </option>
            ))}
          </select>
          {!groupId && (
            <p className="mt-1 text-xs text-foreground/40">
              先にグループを選択すると期の候補が表示されます
            </p>
          )}
          {errors.generation && (
            <p className="mt-1 text-xs text-red-500">{errors.generation}</p>
          )}
        </div>
      )}
    </>
  );
}
