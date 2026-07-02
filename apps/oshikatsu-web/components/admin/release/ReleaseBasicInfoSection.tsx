"use client";

import type { Group } from "@/types/group";
import { RELEASE_TYPES, RELEASE_TYPE_LABELS, type ReleaseType } from "@/types/release";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { supportsNumbering } from "@/components/admin/release/releaseFormShared";

type ReleaseBasicInfoSectionProps = {
  title: string;
  groupId: string;
  releaseType: ReleaseType | "";
  numbering: string;
  releaseDate: string;
  groups: Group[];
  errors: Record<string, string>;
  onTitleChange: (value: string) => void;
  onGroupIdChange: (value: string) => void;
  onReleaseTypeChange: (value: string) => void;
  onNumberingChange: (value: string) => void;
  onReleaseDateChange: (value: string) => void;
};

export function ReleaseBasicInfoSection({
  title,
  groupId,
  releaseType,
  numbering,
  releaseDate,
  groups,
  errors,
  onTitleChange,
  onGroupIdChange,
  onReleaseTypeChange,
  onNumberingChange,
  onReleaseDateChange,
}: ReleaseBasicInfoSectionProps) {
  return (
    <>
      <Input
        id="title"
        label="タイトル*"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        error={errors.title}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          id="groupId"
          label="グループ*"
          placeholder="選択してください"
          options={groups.map((group) => ({
            value: group.id,
            label: group.nameJa,
          }))}
          value={groupId}
          onChange={(e) => onGroupIdChange(e.target.value)}
          error={errors.groupId}
        />

        <Select
          id="releaseType"
          label="リリースタイプ*"
          placeholder="選択してください"
          options={RELEASE_TYPES.map((type) => ({
            value: type,
            label: RELEASE_TYPE_LABELS[type],
          }))}
          value={releaseType}
          onChange={(e) => onReleaseTypeChange(e.target.value)}
          error={errors.releaseType}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          id="numbering"
          label="ナンバリング"
          type="number"
          min={1}
          value={numbering}
          onChange={(e) => onNumberingChange(e.target.value)}
          disabled={!supportsNumbering(releaseType)}
          error={errors.numbering}
        />
        <Input
          id="releaseDate"
          label="リリース日"
          type="date"
          value={releaseDate}
          onChange={(e) => onReleaseDateChange(e.target.value)}
          error={errors.releaseDate}
        />
      </div>
    </>
  );
}
