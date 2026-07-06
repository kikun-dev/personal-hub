"use client";

import { useEffect, useMemo, useState } from "react";
import type { Group } from "@/types/group";
import type { MemberOption } from "@/types/member";
import type { PersonOption } from "@/types/person";
import type {
  CreateReleaseBonusVideoInput,
  CreateReleaseInput,
  CreateReleaseMemberPositionInput,
  CreateReleaseTrackLinkInput,
  ReleaseImageUploadInput,
} from "@/types/release";
import { getManualFrontSpecialSelectionLabel } from "@/lib/selectionPositionRules";
import { readFileAsBase64 } from "@/lib/readFileAsBase64";
import type { ValidationError } from "@/types/errors";
import { Button } from "@/components/ui/Button";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import {
  RELEASE_IMAGE_ALLOWED_MIME_TYPES,
  RELEASE_IMAGE_MAX_BYTES,
  RELEASE_IMAGE_PATH_PREFIX,
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
import { addKeyedItem, removeKeyedItem, updateKeyedItem } from "@/lib/keyedList";
import { toErrorMap, useAdminForm } from "@/hooks/useAdminForm";
import {
  supportsNumbering,
  type FormBonusVideo,
  type FormTrackLink,
  type ReleaseParticipantOption,
  type ReleaseTrackOption,
} from "@/components/admin/release/releaseFormShared";
import {
  getDefaultValues,
  toFormValues,
  toSubmitValues,
  withBonusKey,
  withTrackKey,
  type FormValues,
} from "@/components/admin/release/releaseFormValues";
import { ReleaseBasicInfoSection } from "@/components/admin/release/ReleaseBasicInfoSection";
import { ReleaseArtworkSection } from "@/components/admin/release/ReleaseArtworkSection";
import { ReleaseBonusVideosSection } from "@/components/admin/release/ReleaseBonusVideosSection";
import { ReleaseTracksSection } from "@/components/admin/release/ReleaseTracksSection";
import { ReleaseParticipantsSection } from "@/components/admin/release/ReleaseParticipantsSection";
import { ReleaseMemberPositionsSection } from "@/components/admin/release/ReleaseMemberPositionsSection";

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

export function ReleaseForm({
  mode,
  initialValues,
  groups,
  members,
  tracks,
  people,
  onSubmit,
}: ReleaseFormProps) {
  const { values, setValues, update, errors, setErrors, isSubmitting, setIsSubmitting } =
    useAdminForm<FormValues>({
      initialValues: () => (initialValues ? toFormValues(initialValues) : getDefaultValues()),
      // ReleaseForm は未登録スタッフ確認モーダルによる中断・再開や画像アップロードを含む
      // 独自の handleSubmit を持つため、hook の handleSubmit は使わない（state 基盤のみ利用する）。
    });
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

  const participantOptions = useMemo<ReleaseParticipantOption[]>(() => {
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
      bonusVideos: addKeyedItem(
        prev.bonusVideos,
        withBonusKey({
          edition: "",
          title: "",
          description: "",
        })
      ),
    }));
  };

  const updateBonusVideo = (
    key: string,
    field: keyof CreateReleaseBonusVideoInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      bonusVideos: updateKeyedItem(prev.bonusVideos, (bonus) => bonus._key, key, {
        [field]: value,
      } as Partial<FormBonusVideo>),
    }));
  };

  const removeBonusVideo = (key: string) => {
    setValues((prev) => ({
      ...prev,
      bonusVideos: removeKeyedItem(prev.bonusVideos, (bonus) => bonus._key, key),
    }));
  };

  const addTrackLink = () => {
    const nextTrack = withTrackKey({ trackId: "", trackNumber: String(values.trackLinks.length + 1) });
    setValues((prev) => ({
      ...prev,
      trackLinks: addKeyedItem(prev.trackLinks, nextTrack),
    }));
  };

  const updateTrackLink = (
    key: string,
    field: keyof CreateReleaseTrackLinkInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      trackLinks: updateKeyedItem(prev.trackLinks, (trackLink) => trackLink._key, key, {
        [field]: value,
      } as Partial<FormTrackLink>),
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
      trackLinks: removeKeyedItem(prev.trackLinks, (trackLink) => trackLink._key, key),
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
        setErrors(toErrorMap(result.errors));
      }
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 本体バリデーションを先に通す（制作陣マスタだけが更新される状態を避ける）。
    // アップロード予定ファイルがある場合、実際の artworkPath は保存アクションの
    // アップロード後に設定されるため、事前検証では暫定の有効 path を入れる。
    const submitValues = toSubmitValues(values, frontSpecialLabel !== null);
    const validationInput =
      pendingArtworkFile && !submitValues.artworkPath
        ? { ...submitValues, artworkPath: `${RELEASE_IMAGE_PATH_PREFIX}pending` }
        : submitValues;
    const validationErrors = validateRelease(validationInput);
    if (validationErrors.length > 0) {
      setErrors(toErrorMap(validationErrors));
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
      <FormErrorBanner message={errors._form} />

      <ReleaseBasicInfoSection
        title={values.title}
        groupId={values.groupId}
        releaseType={values.releaseType}
        numbering={values.numbering}
        releaseDate={values.releaseDate}
        groups={groups}
        errors={errors}
        onTitleChange={(value) => update("title", value)}
        onGroupIdChange={(value) => update("groupId", value)}
        onReleaseTypeChange={updateReleaseType}
        onNumberingChange={(value) => update("numbering", value)}
        onReleaseDateChange={(value) => update("releaseDate", value)}
      />

      <ReleaseArtworkSection
        artworkPersonName={values.artworkPersonName}
        people={people}
        errors={errors}
        onArtworkPersonNameChange={(value) => update("artworkPersonName", value)}
        onFileChange={handleArtworkFileChange}
        artworkPreviewSrc={artworkPreviewSrc}
        pendingArtworkFile={pendingArtworkFile}
        onClearArtwork={clearArtwork}
      />

      <ReleaseBonusVideosSection
        bonusVideos={values.bonusVideos}
        errors={errors}
        addBonusVideo={addBonusVideo}
        updateBonusVideo={updateBonusVideo}
        removeBonusVideo={removeBonusVideo}
      />

      <ReleaseTracksSection
        trackLinks={values.trackLinks}
        tracks={tracks}
        trackTitleById={trackTitleById}
        trackQueries={trackQueries}
        errors={errors}
        addTrackLink={addTrackLink}
        updateTrackLink={updateTrackLink}
        removeTrackLink={removeTrackLink}
        updateTrackQuery={updateTrackQuery}
      />

      <ReleaseParticipantsSection
        participantMemberIds={values.participantMemberIds}
        visibleParticipantOptions={visibleParticipantOptions}
        outOfGroupSelectedMemberNames={outOfGroupSelectedMemberNames}
        canAutoRoster={canAutoRoster}
        isComputingRoster={isComputingRoster}
        showAllParticipantMembers={showAllParticipantMembers}
        setShowAllParticipantMembers={setShowAllParticipantMembers}
        errors={errors}
        groupId={values.groupId}
        handleAutoRoster={handleAutoRoster}
        toggleParticipant={toggleParticipant}
      />

      <ReleaseMemberPositionsSection
        releaseType={values.releaseType}
        participantMemberIds={values.participantMemberIds}
        memberNameById={memberNameById}
        frontSpecialLabel={frontSpecialLabel}
        getPosition={getPosition}
        updatePosition={updatePosition}
      />

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
