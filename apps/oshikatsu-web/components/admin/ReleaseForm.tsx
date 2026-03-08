"use client";

import { useState } from "react";
import type { Group } from "@/types/group";
import type { MemberWithGroups } from "@/types/member";
import {
  RELEASE_TYPES,
  RELEASE_TYPE_LABELS,
  type CreateReleaseInput,
  type CreateReleaseBonusVideoInput,
} from "@/types/release";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type FormBonusVideo = CreateReleaseBonusVideoInput & { _key: string };

type FormValues = Omit<CreateReleaseInput, "bonusVideos"> & {
  bonusVideos: FormBonusVideo[];
};

type ReleaseFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateReleaseInput;
  groups: Group[];
  members: MemberWithGroups[];
  onSubmit: (
    values: CreateReleaseInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function withKey(input: CreateReleaseBonusVideoInput): FormBonusVideo {
  return {
    ...input,
    _key: crypto.randomUUID(),
  };
}

function getDefaultValues(): FormValues {
  return {
    title: "",
    groupId: "",
    releaseType: "",
    numbering: "",
    releaseDate: "",
    artworkPath: "",
    participantMemberIds: [],
    bonusVideos: [],
  };
}

function toFormValues(input: CreateReleaseInput): FormValues {
  return {
    ...input,
    bonusVideos: input.bonusVideos.map(withKey),
  };
}

function toSubmitValues(input: FormValues): CreateReleaseInput {
  return {
    title: input.title,
    groupId: input.groupId,
    releaseType: input.releaseType,
    numbering: input.numbering,
    releaseDate: input.releaseDate,
    artworkPath: input.artworkPath,
    participantMemberIds: input.participantMemberIds,
    bonusVideos: input.bonusVideos.map((bonus) => ({
      edition: bonus.edition,
      title: bonus.title,
      description: bonus.description,
    })),
  };
}

function supportsNumbering(releaseType: string): boolean {
  return releaseType === "single" || releaseType === "album";
}

export function ReleaseForm({
  mode,
  initialValues,
  groups,
  members,
  onSubmit,
}: ReleaseFormProps) {
  const [values, setValues] = useState<FormValues>(
    () => initialValues ? toFormValues(initialValues) : getDefaultValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateReleaseType = (releaseType: string) => {
    setValues((prev) => ({
      ...prev,
      releaseType: releaseType as FormValues["releaseType"],
      numbering: supportsNumbering(releaseType) ? prev.numbering : "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.releaseType;
      delete next.numbering;
      return next;
    });
  };

  const toggleParticipant = (memberId: string) => {
    setValues((prev) => ({
      ...prev,
      participantMemberIds: prev.participantMemberIds.includes(memberId)
        ? prev.participantMemberIds.filter((id) => id !== memberId)
        : [...prev.participantMemberIds, memberId],
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.participantMemberIds;
      return next;
    });
  };

  const addBonusVideo = () => {
    setValues((prev) => ({
      ...prev,
      bonusVideos: [
        ...prev.bonusVideos,
        withKey({
          edition: "",
          title: "",
          description: "",
        }),
      ],
    }));
  };

  const updateBonusVideo = (
    key: string,
    field: keyof CreateReleaseBonusVideoInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      bonusVideos: prev.bonusVideos.map((bonus) =>
        bonus._key === key
          ? { ...bonus, [field]: value }
          : bonus
      ),
    }));
  };

  const removeBonusVideo = (key: string) => {
    setValues((prev) => ({
      ...prev,
      bonusVideos: prev.bonusVideos.filter((bonus) => bonus._key !== key),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await onSubmit(toSubmitValues(values));
      if (result.errors) {
        const errorMap: Record<string, string> = {};
        for (const err of result.errors) {
          errorMap[err.field] = err.message;
        }
        setErrors(errorMap);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors._form && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errors._form}
        </p>
      )}

      <Input
        id="title"
        label="タイトル*"
        value={values.title}
        onChange={(e) => update("title", e.target.value)}
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
          value={values.groupId}
          onChange={(e) => update("groupId", e.target.value)}
          error={errors.groupId}
        />

        <Select
          id="releaseType"
          label="リリースタイプ*"
          placeholder="選択してください"
          options={RELEASE_TYPES.map((releaseType) => ({
            value: releaseType,
            label: RELEASE_TYPE_LABELS[releaseType],
          }))}
          value={values.releaseType}
          onChange={(e) => updateReleaseType(e.target.value)}
          error={errors.releaseType}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          id="numbering"
          label="ナンバリング"
          type="number"
          min={1}
          value={values.numbering}
          onChange={(e) => update("numbering", e.target.value)}
          disabled={!supportsNumbering(values.releaseType)}
          error={errors.numbering}
        />
        <Input
          id="releaseDate"
          label="リリース日"
          type="date"
          value={values.releaseDate}
          onChange={(e) => update("releaseDate", e.target.value)}
          error={errors.releaseDate}
        />
      </div>

      <Input
        id="artworkPath"
        label="曲目アートワーク（Storage path）"
        value={values.artworkPath}
        onChange={(e) => update("artworkPath", e.target.value)}
        error={errors.artworkPath}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground/70">
            特典映像
          </label>
          <Button type="button" variant="ghost" onClick={addBonusVideo}>
            + 特典映像を追加
          </Button>
        </div>
        <div className="space-y-3">
          {values.bonusVideos.map((bonus, index) => (
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
          {values.bonusVideos.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
              特典映像は未設定です
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          参加メンバー
        </label>
        {errors.participantMemberIds && (
          <p className="mb-1 text-xs text-red-500">{errors.participantMemberIds}</p>
        )}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-foreground/10 p-2">
          {members.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
            >
              <input
                type="checkbox"
                checked={values.participantMemberIds.includes(member.id)}
                onChange={() => toggleParticipant(member.id)}
                className="rounded"
              />
              <span className="text-foreground">{member.nameJa}</span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
