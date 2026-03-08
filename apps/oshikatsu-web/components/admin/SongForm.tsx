"use client";

import { useEffect, useMemo, useState } from "react";
import type { Release } from "@/types/release";
import type { MemberWithGroups } from "@/types/member";
import type {
  CreateSongInput,
  CreateSongCostumeInput,
  CreateSongFormationRowInput,
  CreateSongReleaseLinkInput,
} from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { RELEASE_TYPE_LABELS } from "@/types/release";

type FormReleaseLink = CreateSongReleaseLinkInput & { _key: string };
type FormFormationRow = CreateSongFormationRowInput & { _key: string };
type FormCostume = CreateSongCostumeInput & { _key: string };

type FormValues = Omit<CreateSongInput, "releaseLinks" | "formationRows" | "costumes"> & {
  releaseLinks: FormReleaseLink[];
  formationRows: FormFormationRow[];
  costumes: FormCostume[];
};

type SongFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateSongInput;
  releases: Release[];
  members: MemberWithGroups[];
  onSubmit: (
    values: CreateSongInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function withReleaseKey(link: CreateSongReleaseLinkInput): FormReleaseLink {
  return { ...link, _key: crypto.randomUUID() };
}

function withFormationRowKey(row: CreateSongFormationRowInput): FormFormationRow {
  return { ...row, _key: crypto.randomUUID() };
}

function withCostumeKey(costume: CreateSongCostumeInput): FormCostume {
  return { ...costume, _key: crypto.randomUUID() };
}

function getDefaultValues(): FormValues {
  return {
    title: "",
    durationSeconds: "",
    releaseLinks: [withReleaseKey({ releaseId: "", trackNumber: "1" })],
    lyricsPeople: "",
    musicPeople: "",
    arrangementPeople: "",
    choreographyPeople: "",
    formationRows: [],
    mv: {
      url: "",
      directorName: "",
      location: "",
      publishedOn: "",
      memo: "",
    },
    costumes: [],
  };
}

function toFormValues(input: CreateSongInput): FormValues {
  return {
    ...input,
    releaseLinks: input.releaseLinks.map(withReleaseKey),
    formationRows: input.formationRows.map(withFormationRowKey),
    costumes: input.costumes.map(withCostumeKey),
  };
}

function toSubmitValues(values: FormValues): CreateSongInput {
  return {
    title: values.title,
    durationSeconds: values.durationSeconds,
    releaseLinks: values.releaseLinks.map((link) => ({
      releaseId: link.releaseId,
      trackNumber: link.trackNumber,
    })),
    lyricsPeople: values.lyricsPeople,
    musicPeople: values.musicPeople,
    arrangementPeople: values.arrangementPeople,
    choreographyPeople: values.choreographyPeople,
    formationRows: values.formationRows.map((row) => ({
      memberCount: row.memberCount,
      memberIds: row.memberIds,
    })),
    mv: values.mv,
    costumes: values.costumes.map((costume) => ({
      stylistName: costume.stylistName,
      imagePath: costume.imagePath,
      note: costume.note,
    })),
  };
}

function parseMemberCount(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function SongForm({
  mode,
  initialValues,
  releases,
  members,
  onSubmit,
}: SongFormProps) {
  const [values, setValues] = useState<FormValues>(
    () => initialValues ? toFormValues(initialValues) : getDefaultValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const releaseMap = useMemo(
    () => new Map<string, Release>(releases.map((release) => [release.id, release])),
    [releases]
  );

  const memberNameById = useMemo(
    () => new Map<string, string>(members.map((member) => [member.id, member.nameJa])),
    [members]
  );

  const participantOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const link of values.releaseLinks) {
      if (!link.releaseId) continue;
      const release = releaseMap.get(link.releaseId);
      if (!release) continue;

      for (let i = 0; i < release.participantMemberIds.length; i++) {
        const memberId = release.participantMemberIds[i];
        const name = release.participantMemberNames[i] ?? memberNameById.get(memberId) ?? "";
        options.set(memberId, name || memberId);
      }
    }

    return Array.from(options.entries())
      .map(([memberId, memberName]) => ({ memberId, memberName }))
      .sort((a, b) => a.memberName.localeCompare(b.memberName));
  }, [memberNameById, releaseMap, values.releaseLinks]);

  useEffect(() => {
    const allowed = new Set(participantOptions.map((option) => option.memberId));

    setValues((prev) => ({
      ...prev,
      formationRows: prev.formationRows.map((row) => ({
        ...row,
        memberIds: row.memberIds.filter((memberId) => allowed.has(memberId)),
      })),
    }));
  }, [participantOptions]);

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

  const addReleaseLink = () => {
    setValues((prev) => ({
      ...prev,
      releaseLinks: [
        ...prev.releaseLinks,
        withReleaseKey({ releaseId: "", trackNumber: "1" }),
      ],
    }));
  };

  const updateReleaseLink = (
    key: string,
    field: keyof CreateSongReleaseLinkInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      releaseLinks: prev.releaseLinks.map((link) =>
        link._key === key ? { ...link, [field]: value } : link
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.releaseLinks;
      return next;
    });
  };

  const removeReleaseLink = (key: string) => {
    setValues((prev) => ({
      ...prev,
      releaseLinks: prev.releaseLinks.filter((link) => link._key !== key),
    }));
  };

  const addFormationRow = () => {
    setValues((prev) => ({
      ...prev,
      formationRows: [
        ...prev.formationRows,
        withFormationRowKey({ memberCount: "0", memberIds: [] }),
      ],
    }));
  };

  const updateFormationRowCount = (key: string, memberCount: string) => {
    setValues((prev) => ({
      ...prev,
      formationRows: prev.formationRows.map((row) => {
        if (row._key !== key) return row;

        const nextCount = parseMemberCount(memberCount);
        const nextMembers = row.memberIds.slice(0, nextCount);

        return {
          ...row,
          memberCount,
          memberIds: nextMembers,
        };
      }),
    }));
  };

  const toggleFormationMember = (key: string, memberId: string) => {
    setValues((prev) => ({
      ...prev,
      formationRows: prev.formationRows.map((row) => {
        if (row._key !== key) return row;

        if (row.memberIds.includes(memberId)) {
          return {
            ...row,
            memberIds: row.memberIds.filter((id) => id !== memberId),
          };
        }

        const limit = parseMemberCount(row.memberCount);
        if (row.memberIds.length >= limit) {
          return row;
        }

        return {
          ...row,
          memberIds: [...row.memberIds, memberId],
        };
      }),
    }));
  };

  const removeFormationRow = (key: string) => {
    setValues((prev) => ({
      ...prev,
      formationRows: prev.formationRows.filter((row) => row._key !== key),
    }));
  };

  const addCostume = () => {
    setValues((prev) => ({
      ...prev,
      costumes: [
        ...prev.costumes,
        withCostumeKey({ stylistName: "", imagePath: "", note: "" }),
      ],
    }));
  };

  const updateCostume = (
    key: string,
    field: keyof CreateSongCostumeInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      costumes: prev.costumes.map((costume) =>
        costume._key === key ? { ...costume, [field]: value } : costume
      ),
    }));
  };

  const removeCostume = (key: string) => {
    setValues((prev) => ({
      ...prev,
      costumes: prev.costumes.filter((costume) => costume._key !== key),
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

      <Input
        id="durationSeconds"
        label="時間（秒）"
        type="number"
        min={1}
        value={values.durationSeconds}
        onChange={(e) => update("durationSeconds", e.target.value)}
        error={errors.durationSeconds}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">紐づけリリース*</label>
          <Button type="button" variant="ghost" onClick={addReleaseLink}>
            + リリースを追加
          </Button>
        </div>
        {errors.releaseLinks && <p className="mb-2 text-xs text-red-500">{errors.releaseLinks}</p>}
        <div className="space-y-2">
          {values.releaseLinks.map((link, index) => {
            const selectedRelease = releaseMap.get(link.releaseId);
            return (
              <div key={link._key} className="rounded-lg border border-foreground/10 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto] sm:items-end">
                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">リリース</label>
                    <select
                      value={link.releaseId}
                      onChange={(e) => updateReleaseLink(link._key, "releaseId", e.target.value)}
                      className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
                    >
                      <option value="">選択してください</option>
                      {releases.map((release) => (
                        <option key={release.id} value={release.id}>
                          {release.title} ({RELEASE_TYPE_LABELS[release.releaseType]})
                        </option>
                      ))}
                    </select>
                    {errors[`releaseLinks.${index}.releaseId`] && (
                      <p className="mt-1 text-xs text-red-500">{errors[`releaseLinks.${index}.releaseId`]}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      id={`trackNumber-${link._key}`}
                      label="曲順"
                      type="number"
                      min={1}
                      value={link.trackNumber}
                      onChange={(e) => updateReleaseLink(link._key, "trackNumber", e.target.value)}
                      error={errors[`releaseLinks.${index}.trackNumber`]}
                    />
                  </div>
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
                    参加メンバー {selectedRelease.participantMemberIds.length}人
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          id="lyricsPeople"
          label="作詞（複数はカンマ区切り）"
          value={values.lyricsPeople}
          onChange={(e) => update("lyricsPeople", e.target.value)}
          error={errors.lyricsPeople}
        />
        <Input
          id="musicPeople"
          label="作曲（複数はカンマ区切り）"
          value={values.musicPeople}
          onChange={(e) => update("musicPeople", e.target.value)}
          error={errors.musicPeople}
        />
        <Input
          id="arrangementPeople"
          label="編曲（複数はカンマ区切り）"
          value={values.arrangementPeople}
          onChange={(e) => update("arrangementPeople", e.target.value)}
          error={errors.arrangementPeople}
        />
        <Input
          id="choreographyPeople"
          label="振付（複数はカンマ区切り）"
          value={values.choreographyPeople}
          onChange={(e) => update("choreographyPeople", e.target.value)}
          error={errors.choreographyPeople}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">フォーメーション</label>
          <Button type="button" variant="ghost" onClick={addFormationRow}>
            + 列を追加
          </Button>
        </div>
        {errors.formationRows && <p className="mb-2 text-xs text-red-500">{errors.formationRows}</p>}
        {participantOptions.length === 0 && values.formationRows.length > 0 && (
          <p className="mb-2 text-xs text-foreground/50">リリースを選択すると参加メンバーを割り当てできます</p>
        )}
        <div className="space-y-3">
          {values.formationRows.map((row, index) => {
            const memberCount = parseMemberCount(row.memberCount);
            return (
              <div key={row._key} className="rounded-lg border border-foreground/10 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{index + 1}列目</p>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => removeFormationRow(row._key)}
                  >
                    削除
                  </button>
                </div>
                <Input
                  id={`formation-member-count-${row._key}`}
                  label="列人数"
                  type="number"
                  min={0}
                  value={row.memberCount}
                  onChange={(e) => updateFormationRowCount(row._key, e.target.value)}
                  error={errors[`formationRows.${index}.memberCount`]}
                />

                <div className="mt-2">
                  <p className="mb-1 text-xs text-foreground/60">
                    参加メンバー割当 ({row.memberIds.length}/{memberCount})
                  </p>
                  {errors[`formationRows.${index}.memberIds`] && (
                    <p className="mb-1 text-xs text-red-500">{errors[`formationRows.${index}.memberIds`]}</p>
                  )}
                  <div className="max-h-40 overflow-y-auto rounded border border-foreground/10 p-2">
                    {participantOptions.map((option) => {
                      const checked = row.memberIds.includes(option.memberId);
                      const disabled = !checked && row.memberIds.length >= memberCount;

                      return (
                        <label
                          key={`${row._key}-${option.memberId}`}
                          className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleFormationMember(row._key, option.memberId)}
                          />
                          <span>{option.memberName}</span>
                        </label>
                      );
                    })}
                    {participantOptions.length === 0 && (
                      <p className="text-xs text-foreground/40">選択可能なメンバーがいません</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {values.formationRows.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
              フォーメーションは未設定です
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-foreground/10 p-4">
        <p className="text-sm font-medium text-foreground">MV</p>
        <Input
          id="mv-url"
          label="MVリンク"
          value={values.mv.url}
          onChange={(e) => update("mv", { ...values.mv, url: e.target.value })}
          error={errors["mv.url"]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            id="mv-director"
            label="監督"
            value={values.mv.directorName}
            onChange={(e) => update("mv", { ...values.mv, directorName: e.target.value })}
            error={errors["mv.directorName"]}
          />
          <Input
            id="mv-location"
            label="ロケ地"
            value={values.mv.location}
            onChange={(e) => update("mv", { ...values.mv, location: e.target.value })}
            error={errors["mv.location"]}
          />
          <Input
            id="mv-published-on"
            label="配信日"
            type="date"
            value={values.mv.publishedOn}
            onChange={(e) => update("mv", { ...values.mv, publishedOn: e.target.value })}
            error={errors["mv.publishedOn"]}
          />
        </div>
        <Textarea
          id="mv-memo"
          label="MVメモ"
          value={values.mv.memo}
          onChange={(e) => update("mv", { ...values.mv, memo: e.target.value })}
          error={errors["mv.memo"]}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">衣装</label>
          <Button type="button" variant="ghost" onClick={addCostume}>
            + 衣装を追加
          </Button>
        </div>
        <div className="space-y-3">
          {values.costumes.map((costume, index) => (
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
                  value={costume.stylistName}
                  onChange={(e) => updateCostume(costume._key, "stylistName", e.target.value)}
                  error={errors[`costumes.${index}.stylistName`]}
                />
                <Input
                  id={`costume-image-${costume._key}`}
                  label="画像（Storage path）*"
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
          {values.costumes.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
              衣装は未設定です
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
