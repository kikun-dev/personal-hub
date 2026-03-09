"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Group } from "@/types/group";
import type { MemberWithGroups } from "@/types/member";
import {
  RELEASE_TYPES,
  RELEASE_TYPE_LABELS,
  type CreateReleaseInput,
  type CreateReleaseBonusVideoInput,
  type CreateReleaseTrackLinkInput,
  type ReleaseImageUploadInput,
} from "@/types/release";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  RELEASE_IMAGE_ALLOWED_MIME_TYPES,
  RELEASE_IMAGE_MAX_BYTES,
  isAllowedReleaseImageMimeType,
  resolveReleaseImageSrc,
} from "@/lib/releaseImage";

type FormBonusVideo = CreateReleaseBonusVideoInput & { _key: string };
type FormTrackLink = CreateReleaseTrackLinkInput & { _key: string };

type FormValues = Omit<CreateReleaseInput, "bonusVideos" | "trackLinks"> & {
  bonusVideos: FormBonusVideo[];
  trackLinks: FormTrackLink[];
};

type ReleaseTrackOption = {
  id: string;
  title: string;
};

type ReleaseFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateReleaseInput;
  groups: Group[];
  members: MemberWithGroups[];
  tracks: ReleaseTrackOption[];
  people: string[];
  onSubmit: (
    values: CreateReleaseInput,
    imageFile?: ReleaseImageUploadInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function withBonusKey(input: CreateReleaseBonusVideoInput): FormBonusVideo {
  return {
    ...input,
    _key: crypto.randomUUID(),
  };
}

function withTrackKey(input: CreateReleaseTrackLinkInput): FormTrackLink {
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
    artworkPersonName: "",
    participantMemberIds: [],
    bonusVideos: [],
    trackLinks: [],
  };
}

function toFormValues(input: CreateReleaseInput): FormValues {
  return {
    ...input,
    bonusVideos: input.bonusVideos.map(withBonusKey),
    trackLinks: input.trackLinks.map(withTrackKey),
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
    artworkPersonName: input.artworkPersonName,
    participantMemberIds: input.participantMemberIds,
    bonusVideos: input.bonusVideos.map((bonus) => ({
      edition: bonus.edition,
      title: bonus.title,
      description: bonus.description,
    })),
    trackLinks: input.trackLinks.map((trackLink) => ({
      trackId: trackLink.trackId,
      trackNumber: trackLink.trackNumber,
    })),
  };
}

function supportsNumbering(releaseType: string): boolean {
  return releaseType === "single" || releaseType === "album";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("invalid_file_reader_result"));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("invalid_base64_data"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

export function ReleaseForm({
  mode,
  initialValues,
  groups,
  members,
  tracks,
  people,
  onSubmit,
}: ReleaseFormProps) {
  const [values, setValues] = useState<FormValues>(
    () => (initialValues ? toFormValues(initialValues) : getDefaultValues())
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingArtworkFile, setPendingArtworkFile] = useState<File | null>(null);
  const [pendingArtworkPreviewUrl, setPendingArtworkPreviewUrl] = useState<string | null>(null);
  const [trackQueries, setTrackQueries] = useState<Record<string, string>>({});

  const trackTitleById = useMemo(
    () => new Map<string, string>(tracks.map((track) => [track.id, track.title])),
    [tracks]
  );

  const selectableMembers = useMemo(() => {
    if (!values.groupId) {
      return members;
    }

    return members.filter((member) =>
      member.groups.some((group) => group.groupId === values.groupId)
    );
  }, [members, values.groupId]);

  useEffect(() => {
    const allowedMemberIds = new Set(selectableMembers.map((member) => member.id));

    setValues((prev) => ({
      ...prev,
      participantMemberIds: prev.participantMemberIds.filter((memberId) => allowedMemberIds.has(memberId)),
    }));
  }, [selectableMembers]);

  useEffect(() => {
    return () => {
      if (pendingArtworkPreviewUrl) {
        URL.revokeObjectURL(pendingArtworkPreviewUrl);
      }
    };
  }, [pendingArtworkPreviewUrl]);

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
        withBonusKey({
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

  const addTrackLink = () => {
    const nextTrack = withTrackKey({ trackId: "", trackNumber: String(values.trackLinks.length + 1) });
    setValues((prev) => ({
      ...prev,
      trackLinks: [...prev.trackLinks, nextTrack],
    }));
  };

  const updateTrackLink = (
    key: string,
    field: keyof CreateReleaseTrackLinkInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      trackLinks: prev.trackLinks.map((trackLink) =>
        trackLink._key === key ? { ...trackLink, [field]: value } : trackLink
      ),
    }));

    setErrors((prev) => {
      const next = { ...prev };
      delete next.trackLinks;
      return next;
    });
  };

  const removeTrackLink = (key: string) => {
    setValues((prev) => ({
      ...prev,
      trackLinks: prev.trackLinks.filter((trackLink) => trackLink._key !== key),
    }));
    setTrackQueries((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateTrackQuery = (key: string, query: string) => {
    setTrackQueries((prev) => ({
      ...prev,
      [key]: query,
    }));
  };

  const clearPendingArtwork = () => {
    if (pendingArtworkPreviewUrl) {
      URL.revokeObjectURL(pendingArtworkPreviewUrl);
    }
    setPendingArtworkPreviewUrl(null);
    setPendingArtworkFile(null);
  };

  const handleArtworkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedReleaseImageMimeType(file.type)) {
      clearPendingArtwork();
      setErrors((prev) => ({
        ...prev,
        artworkPath: `画像形式は ${RELEASE_IMAGE_ALLOWED_MIME_TYPES.join(", ")} のみ対応しています`,
      }));
      return;
    }

    if (file.size > RELEASE_IMAGE_MAX_BYTES) {
      clearPendingArtwork();
      setErrors((prev) => ({
        ...prev,
        artworkPath: `画像サイズは ${Math.floor(RELEASE_IMAGE_MAX_BYTES / (1024 * 1024))}MB 以下にしてください`,
      }));
      return;
    }

    if (pendingArtworkPreviewUrl) {
      URL.revokeObjectURL(pendingArtworkPreviewUrl);
    }

    setPendingArtworkFile(file);
    setPendingArtworkPreviewUrl(URL.createObjectURL(file));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.artworkPath;
      return next;
    });
  };

  const clearArtwork = () => {
    clearPendingArtwork();
    update("artworkPath", "");
    update("artworkPersonName", "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    let imageFile: ReleaseImageUploadInput | undefined;

    try {
      if (pendingArtworkFile) {
        setIsUploadingImage(true);
        try {
          const base64Data = await readFileAsBase64(pendingArtworkFile);
          imageFile = {
            fileName: pendingArtworkFile.name,
            mimeType: pendingArtworkFile.type,
            size: pendingArtworkFile.size,
            base64Data,
          };
        } catch {
          setErrors({
            artworkPath: "画像アップロードに失敗しました。時間をおいて再度お試しください",
          });
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const result = await onSubmit(toSubmitValues(values), imageFile);
      if (result.errors) {
        const errorMap: Record<string, string> = {};
        for (const err of result.errors) {
          errorMap[err.field] = err.message;
        }
        setErrors(errorMap);
      }
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const savedArtworkSrc = resolveReleaseImageSrc(values.artworkPath || null);
  const artworkPreviewSrc = pendingArtworkPreviewUrl ?? savedArtworkSrc;

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

      <div className="space-y-3 rounded-lg border border-foreground/10 p-4">
        <p className="text-sm font-medium text-foreground">曲目アートワーク</p>

        <Input
          id="artworkPersonName"
          label="担当者"
          list="artwork-person-suggestions"
          value={values.artworkPersonName}
          onChange={(e) => update("artworkPersonName", e.target.value)}
          error={errors.artworkPersonName}
        />
        <datalist id="artwork-person-suggestions">
          {people.map((personName) => (
            <option key={personName} value={personName} />
          ))}
        </datalist>

        <div>
          <label
            htmlFor="artworkFile"
            className="mb-1 block text-sm font-medium text-foreground/70"
          >
            画像（JPEG / PNG / WebP）
          </label>
          <input
            id="artworkFile"
            type="file"
            accept={RELEASE_IMAGE_ALLOWED_MIME_TYPES.join(",")}
            onChange={handleArtworkFileChange}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm ${
              errors.artworkPath ? "border-red-400" : "border-foreground/10"
            }`}
          />
          <p className="mt-1 text-xs text-foreground/50">
            最大 {Math.floor(RELEASE_IMAGE_MAX_BYTES / (1024 * 1024))}MB
          </p>
          {errors.artworkPath && <p className="mt-1 text-xs text-red-500">{errors.artworkPath}</p>}

          {artworkPreviewSrc && (
            <div className="mt-3 space-y-2 rounded-lg border border-foreground/10 p-3">
              <Image
                src={artworkPreviewSrc}
                alt="アートワークプレビュー"
                width={280}
                height={160}
                unoptimized={artworkPreviewSrc.startsWith("blob:")}
                className="h-40 w-full max-w-[280px] rounded-lg object-cover"
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={clearArtwork}>
                  画像を外す
                </Button>
                <p className="text-xs text-foreground/50">
                  {pendingArtworkFile ? "保存時に画像をアップロードします" : "保存済み画像を表示中"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground/70">特典映像</label>
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
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">曲目（楽曲）</label>
          <Button type="button" variant="ghost" onClick={addTrackLink}>
            + 楽曲を追加
          </Button>
        </div>
        {errors.trackLinks && <p className="mb-2 text-xs text-red-500">{errors.trackLinks}</p>}
        <div className="space-y-2">
          {values.trackLinks.map((trackLink, index) => {
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
          {values.trackLinks.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
              楽曲は未設定です
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
          {selectableMembers.map((member) => (
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
          {selectableMembers.length === 0 && (
            <p className="px-2 py-1 text-xs text-foreground/40">
              選択中グループに在籍歴のあるメンバーがいません
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting || isUploadingImage} className="w-full">
        {isSubmitting || isUploadingImage
          ? "保存中..."
          : mode === "create"
            ? "登録する"
            : "更新する"}
      </Button>
    </form>
  );
}
