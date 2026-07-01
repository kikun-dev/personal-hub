"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Group } from "@/types/group";
import type { MemberOption } from "@/types/member";
import type { PersonOption } from "@/types/person";
import {
  RELEASE_TYPES,
  RELEASE_TYPE_LABELS,
  type CreateReleaseInput,
  type CreateReleaseBonusVideoInput,
  type CreateReleaseMemberPositionInput,
  type CreateReleaseTrackLinkInput,
  type ReleaseImageUploadInput,
} from "@/types/release";
import { getManualFrontSpecialSelectionLabel } from "@/lib/selectionPositionRules";
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
import { computeLiveRosterAction } from "@/app/(authenticated)/admin/lives/rosterAction";
import { ensureStaffRolesAction } from "@/app/(authenticated)/admin/staffRolesAction";
import { UnregisteredStaffModal } from "@/components/admin/UnregisteredStaffModal";
import {
  findUnregisteredStaff,
  dedupeUnregisteredStaff,
  type UnregisteredStaff,
} from "@/lib/staffRoles";
import { validateRelease } from "@/usecases/validateRelease";

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
  members: MemberOption[];
  tracks: ReleaseTrackOption[];
  people: PersonOption[];
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
    memberPositions: [],
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

function toSubmitValues(
  input: FormValues,
  supportsFrontSpecial: boolean
): CreateReleaseInput {
  return {
    title: input.title,
    groupId: input.groupId,
    releaseType: input.releaseType,
    numbering: input.numbering,
    releaseDate: input.releaseDate,
    artworkPath: input.artworkPath,
    artworkPersonName: input.artworkPersonName,
    participantMemberIds: input.participantMemberIds,
    // 選抜ポジションはシングルのみ・参加メンバーに限定して保存する
    memberPositions:
      input.releaseType === "single"
        ? input.memberPositions
            .filter((position) =>
              input.participantMemberIds.includes(position.memberId)
            )
            .map((position) => ({
              memberId: position.memberId,
              // グループが福神/櫻エイト非対応なら front_special をクリア
              isFrontSpecial: supportsFrontSpecial
                ? position.isFrontSpecial
                : false,
              isHiatus: position.isHiatus,
            }))
            // 福神/休業中いずれかが立つメンバーのみ保持（overlay）
            .filter((position) => position.isFrontSpecial || position.isHiatus)
        : [],
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
  const [unregisteredStaff, setUnregisteredStaff] = useState<UnregisteredStaff[]>(
    []
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingArtworkFile, setPendingArtworkFile] = useState<File | null>(null);
  const [pendingArtworkPreviewUrl, setPendingArtworkPreviewUrl] = useState<string | null>(null);
  const [trackQueries, setTrackQueries] = useState<Record<string, string>>({});
  const [showAllParticipantMembers, setShowAllParticipantMembers] = useState(false);
  const [isComputingRoster, setIsComputingRoster] = useState(false);

  const trackTitleById = useMemo(
    () => new Map<string, string>(tracks.map((track) => [track.id, track.title])),
    [tracks]
  );

  const participantOptions = useMemo(() => {
    return members
      .map((member) => ({
        id: member.id,
        nameJa: member.nameJa,
        isInReleaseGroup:
          values.groupId.length > 0
            ? member.groupIds.includes(values.groupId)
            : true,
      }))
      .sort((a, b) => a.nameJa.localeCompare(b.nameJa));
  }, [members, values.groupId]);

  const selectedParticipantMemberIds = useMemo(
    () => new Set(values.participantMemberIds),
    [values.participantMemberIds]
  );

  const visibleParticipantOptions = useMemo(() => {
    if (showAllParticipantMembers) {
      return participantOptions;
    }

    return participantOptions.filter(
      (option) => option.isInReleaseGroup || selectedParticipantMemberIds.has(option.id)
    );
  }, [participantOptions, selectedParticipantMemberIds, showAllParticipantMembers]);

  const outOfGroupSelectedMemberNames = useMemo(
    () =>
      participantOptions
        .filter(
          (option) =>
            selectedParticipantMemberIds.has(option.id) && !option.isInReleaseGroup
        )
        .map((option) => option.nameJa),
    [participantOptions, selectedParticipantMemberIds]
  );

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

  // リリース日×グループから在籍メンバーを自動入力する
  const canAutoRoster = values.groupId !== "" && values.releaseDate !== "";
  const handleAutoRoster = async () => {
    if (!canAutoRoster) return;
    setIsComputingRoster(true);
    try {
      const { memberIds } = await computeLiveRosterAction(
        [values.groupId],
        values.releaseDate
      );
      // 既存の選択は残しつつ、算出メンバーを追加（その後手動調整）
      setValues((prev) => ({
        ...prev,
        participantMemberIds: [
          ...new Set([...prev.participantMemberIds, ...memberIds]),
        ],
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.participantMemberIds;
        return next;
      });
    } finally {
      setIsComputingRoster(false);
    }
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

  const memberNameById = useMemo(
    () => new Map(members.map((member) => [member.id, member.nameJa])),
    [members]
  );

  const selectedGroupName = groups.find(
    (group) => group.id === values.groupId
  )?.nameJa;
  const frontSpecialLabel =
    getManualFrontSpecialSelectionLabel(selectedGroupName);

  const getPosition = (memberId: string): CreateReleaseMemberPositionInput =>
    values.memberPositions.find((position) => position.memberId === memberId) ?? {
      memberId,
      isFrontSpecial: false,
      isHiatus: false,
    };

  const updatePosition = (
    memberId: string,
    patch: Partial<CreateReleaseMemberPositionInput>
  ) => {
    setValues((prev) => {
      const exists = prev.memberPositions.some(
        (position) => position.memberId === memberId
      );
      const base = prev.memberPositions.find(
        (position) => position.memberId === memberId
      ) ?? { memberId, isFrontSpecial: false, isHiatus: false };
      const nextPosition = { ...base, ...patch };
      return {
        ...prev,
        memberPositions: exists
          ? prev.memberPositions.map((position) =>
              position.memberId === memberId ? nextPosition : position
            )
          : [...prev.memberPositions, nextPosition],
      };
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

  const applyValidationErrors = (validationErrors: ValidationError[]) => {
    const errorMap: Record<string, string> = {};
    for (const err of validationErrors) {
      errorMap[err.field] = err.message;
    }
    setErrors(errorMap);
  };

  // アートワーク担当で、artwork role の候補に無い名前を未登録として集める
  const collectUnregisteredStaff = (): UnregisteredStaff[] =>
    dedupeUnregisteredStaff(
      findUnregisteredStaff(people, "artwork", [values.artworkPersonName])
    );

  const proceedSubmit = async () => {
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

      const result = await onSubmit(
        toSubmitValues(values, frontSpecialLabel !== null),
        imageFile
      );
      if (result.errors) {
        applyValidationErrors(result.errors);
      }
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 本体バリデーションを先に通す（制作陣マスタだけが更新される状態を避ける）
    const validationErrors = validateRelease(
      toSubmitValues(values, frontSpecialLabel !== null)
    );
    if (validationErrors.length > 0) {
      applyValidationErrors(validationErrors);
      return;
    }
    const unregistered = collectUnregisteredStaff();
    if (unregistered.length > 0) {
      setUnregisteredStaff(unregistered);
      return;
    }
    await proceedSubmit();
  };

  const handleConfirmUnregistered = async () => {
    setIsSubmitting(true);
    try {
      await ensureStaffRolesAction(
        unregisteredStaff.map((entry) => ({
          displayName: entry.displayName,
          role: entry.role,
        }))
      );
    } catch {
      setErrors((prev) => ({
        ...prev,
        _form: "制作陣の追加に失敗しました。時間をおいて再度お試しください",
      }));
      setIsSubmitting(false);
      return;
    }
    setUnregisteredStaff([]);
    setIsSubmitting(false);
    await proceedSubmit();
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
        <p className="text-sm font-medium text-foreground">収録曲アートワーク</p>

        <Input
          id="artworkPersonName"
          label="担当者"
          list="artwork-person-suggestions"
          value={values.artworkPersonName}
          onChange={(e) => update("artworkPersonName", e.target.value)}
          error={errors.artworkPersonName}
        />
        <datalist id="artwork-person-suggestions">
          {people
            .filter((person) => person.roles.includes("artwork"))
            .map((person) => (
              <option key={person.id} value={person.displayName} />
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
          <label className="text-sm font-medium text-foreground/70">収録曲（楽曲）</label>
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
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm font-medium text-foreground/70">
            参加メンバー
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoRoster}
              disabled={!canAutoRoster || isComputingRoster}
              className="rounded-lg border border-foreground/10 px-2 py-1 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40"
            >
              {isComputingRoster ? "計算中..." : "リリース日・グループから自動入力"}
            </button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAllParticipantMembers((prev) => !prev)}
            >
              {showAllParticipantMembers ? "同グループのみ表示" : "他グループも表示"}
            </Button>
          </div>
        </div>
        {!canAutoRoster && (
          <p className="mb-1 text-xs text-foreground/40">
            ※自動入力にはグループの選択とリリース日の入力が必要です
          </p>
        )}
        {errors.participantMemberIds && (
          <p className="mb-1 text-xs text-red-500">{errors.participantMemberIds}</p>
        )}
        {!showAllParticipantMembers && values.groupId && (
          <p className="mb-2 text-xs text-foreground/50">
            同グループ在籍歴のあるメンバーを優先表示中です
          </p>
        )}
        {outOfGroupSelectedMemberNames.length > 0 && (
          <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            注意: リリースグループ外のメンバーが選択されています（
            {outOfGroupSelectedMemberNames.join(" / ")}）
          </p>
        )}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-foreground/10 p-2">
          {visibleParticipantOptions.map((member) => (
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
              <span className="text-foreground">
                {member.nameJa}
                {!member.isInReleaseGroup && (
                  <span className="ml-1 text-xs text-amber-600">(グループ外)</span>
                )}
              </span>
            </label>
          ))}
          {visibleParticipantOptions.length === 0 && (
            <p className="px-2 py-1 text-xs text-foreground/40">
              選択中グループに在籍歴のあるメンバーがいません
            </p>
          )}
        </div>
      </div>

      {values.releaseType === "single" &&
        values.participantMemberIds.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground/70">
              選抜ポジション（手動指定）
            </label>
            <p className="text-xs text-foreground/50">
              選抜/アンダー/列/センターは楽曲のフォーメーションから自動表示されます。
              ここでは{frontSpecialLabel ? `${frontSpecialLabel}・` : ""}休業中のみ指定します。
              {frontSpecialLabel
                ? `（${frontSpecialLabel}は選抜=表題曲のメンバーにのみ反映されます）`
                : ""}
            </p>
            <div className="space-y-1">
              {values.participantMemberIds.map((memberId) => {
                const position = getPosition(memberId);
                return (
                  <div
                    key={memberId}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-foreground/10 p-2 text-xs"
                  >
                    <span className="text-sm text-foreground">
                      {memberNameById.get(memberId) ?? memberId}
                    </span>
                    {frontSpecialLabel && (
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={position.isFrontSpecial}
                          onChange={(e) =>
                            updatePosition(memberId, {
                              isFrontSpecial: e.target.checked,
                            })
                          }
                        />
                        {frontSpecialLabel}
                      </label>
                    )}
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={position.isHiatus}
                        onChange={(e) =>
                          updatePosition(memberId, {
                            isHiatus: e.target.checked,
                          })
                        }
                      />
                      休業中
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      <Button type="submit" disabled={isSubmitting || isUploadingImage} className="w-full">
        {isSubmitting || isUploadingImage
          ? "保存中..."
          : mode === "create"
            ? "登録する"
            : "更新する"}
      </Button>

      <UnregisteredStaffModal
        entries={unregisteredStaff}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmUnregistered}
        onCancel={() => setUnregisteredStaff([])}
      />
    </form>
  );
}
