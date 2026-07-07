"use client";

import { useState } from "react";
import type { ValidationError } from "@/types/errors";
import type { CreateSpotInput, SpotPhotoUploadInput } from "@/types/spot";
import { isPrefecture } from "@/lib/prefectures";
import { readFileAsBase64 } from "@/lib/readFileAsBase64";
import {
  addKeyedItem,
  moveKeyedItem,
  removeKeyedItem,
  updateKeyedItem,
  withGeneratedKey,
} from "@/lib/keyedList";
import {
  SPOT_PHOTO_ALLOWED_MIME_TYPES,
  SPOT_PHOTO_MAX_BYTES,
  SPOT_PHOTO_MAX_COUNT,
  isAllowedSpotPhotoMimeType,
} from "@/lib/spotPhoto";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { toErrorMap, useAdminForm } from "@/hooks/useAdminForm";
import type { SpotPlaceSearchResult } from "@/components/admin/SpotPlaceSearch";
import {
  SpotPhotosSection,
  withGeneratedPhotoKey,
} from "@/components/admin/spot/SpotPhotosSection";
import {
  OVERSEAS_VALUE,
  SpotLocationSection,
} from "@/components/admin/spot/SpotLocationSection";
import { SpotAppearancesSection } from "@/components/admin/spot/SpotAppearancesSection";
import type {
  AppearanceField,
  SpotFormMasterData,
} from "@/components/admin/spot/spotFormShared";
import {
  getDefaultAppearance,
  getDefaultValues,
  toFormValues,
  toSubmitValues,
  type FormValues,
} from "@/components/admin/spot/spotFormValues";

// ページ（spots/new・spots/[id]/edit）からの既存 import を維持するための re-export。
export type { SpotFormMasterData } from "@/components/admin/spot/spotFormShared";

type SpotFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateSpotInput;
  masters: SpotFormMasterData;
  onSubmit: (
    values: CreateSpotInput
  ) => Promise<{ errors?: ValidationError[] }>;
  // ファイル選択と同時に Storage へアップロードし、imagePath を返す
  // サーバーアクション。呼び出し元ページ（new/edit）が requireAdmin 済みの
  // アクションを渡す。
  onUploadPhoto: (
    imageFile: SpotPhotoUploadInput
  ) => Promise<{ imagePath?: string; errors?: ValidationError[] }>;
};

export function SpotForm({
  mode,
  initialValues,
  masters,
  onSubmit,
  onUploadPhoto,
}: SpotFormProps) {
  // 都道府県が空でなく47に無い＝海外（地域名手入力）。VenueForm と同じパターン。
  const [isOverseas, setIsOverseas] = useState(() => {
    const initial = initialValues ?? getDefaultValues();
    return initial.prefecture !== "" && !isPrefecture(initial.prefecture);
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  const {
    values,
    setValues,
    update,
    errors,
    setErrors,
    isSubmitting,
    setIsSubmitting,
  } = useAdminForm<FormValues>({
    initialValues: () =>
      initialValues ? toFormValues(initialValues) : getDefaultValues(),
    // appearances に _key を持つ独自の FormValues を submit 時に CreateSpotInput へ
    // 変換する必要があるため、hook 標準の handleSubmit は使わず自前で実装する
    // （SongForm 等と同じ方針）。
  });

  const handlePlaceSelect = (result: SpotPlaceSearchResult) => {
    setValues((prev) => ({
      ...prev,
      // 名前は空のときだけ上書きする（既に入力済みの名前を検索結果で潰さない）
      name: prev.name.trim() ? prev.name : result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address,
      prefecture: result.prefecture,
      googlePlaceId: result.googlePlaceId,
      googleMapsUrl: result.googleMapsUrl,
    }));
    setIsOverseas(result.prefecture !== "" && !isPrefecture(result.prefecture));
  };

  const handlePrefectureSelect = (selected: string) => {
    if (selected === OVERSEAS_VALUE) {
      setIsOverseas(true);
      update("prefecture", "");
    } else {
      setIsOverseas(false);
      update("prefecture", selected);
    }
  };

  const addAppearance = () => {
    setValues((prev) => ({
      ...prev,
      appearances: addKeyedItem(
        prev.appearances,
        withGeneratedKey(getDefaultAppearance())
      ),
    }));
  };

  const updateAppearance = (key: string, patch: Partial<AppearanceField>) => {
    setValues((prev) => ({
      ...prev,
      appearances: updateKeyedItem(prev.appearances, (a) => a._key, key, patch),
    }));
  };

  const removeAppearance = (key: string) => {
    setValues((prev) => ({
      ...prev,
      appearances: removeKeyedItem(prev.appearances, (a) => a._key, key),
    }));
  };

  // 出典種別を変更したら4つのFK値をすべて空にリセットする
  // （validateSpot の「出典種別と出典の指定の食い違い」チェックに引っかからないように）。
  // サブ種別マスタは種別ごとに分かれているため、subtypeName も一緒にリセットする。
  const handleSourceTypeChange = (key: string, sourceType: string) => {
    updateAppearance(key, {
      sourceType,
      trackId: "",
      videoId: "",
      eventId: "",
      liveId: "",
      subtypeName: "",
    });
  };

  const toggleAppearanceMember = (key: string, memberId: string) => {
    setValues((prev) => ({
      ...prev,
      appearances: updateKeyedItem(prev.appearances, (a) => a._key, key, (a) => ({
        ...a,
        memberIds: a.memberIds.includes(memberId)
          ? a.memberIds.filter((id) => id !== memberId)
          : [...a.memberIds, memberId],
      })),
    }));
  };

  const updatePhotoCaption = (key: string, caption: string) => {
    setValues((prev) => ({
      ...prev,
      photos: updateKeyedItem(prev.photos, (p) => p._key, key, { caption }),
    }));
  };

  const removePhoto = (key: string) => {
    setValues((prev) => ({
      ...prev,
      photos: removeKeyedItem(prev.photos, (p) => p._key, key),
    }));
  };

  const movePhoto = (key: string, direction: -1 | 1) => {
    setValues((prev) => ({
      ...prev,
      photos: moveKeyedItem(prev.photos, (p) => p._key, key, direction),
    }));
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じファイルを続けて選択してもイベントが発火するように、入力欄はここでリセットする
    e.target.value = "";
    if (!file) return;

    setPhotoUploadError(null);

    if (values.photos.length >= SPOT_PHOTO_MAX_COUNT) {
      setPhotoUploadError(`写真は${SPOT_PHOTO_MAX_COUNT}件までです`);
      return;
    }

    if (!isAllowedSpotPhotoMimeType(file.type)) {
      setPhotoUploadError(
        `画像形式は ${SPOT_PHOTO_ALLOWED_MIME_TYPES.join(", ")} のみ対応しています`
      );
      return;
    }

    if (file.size > SPOT_PHOTO_MAX_BYTES) {
      setPhotoUploadError(
        `画像サイズは ${Math.floor(SPOT_PHOTO_MAX_BYTES / (1024 * 1024))}MB 以下にしてください`
      );
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const base64Data = await readFileAsBase64(file);
      const result = await onUploadPhoto({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        base64Data,
      });

      if (!result.imagePath) {
        setPhotoUploadError(
          result.errors?.[0]?.message ?? "画像のアップロードに失敗しました"
        );
        return;
      }

      const imagePath = result.imagePath;
      setValues((prev) => ({
        ...prev,
        photos: addKeyedItem(prev.photos, withGeneratedPhotoKey({ imagePath, caption: "" })),
      }));
    } catch {
      setPhotoUploadError("画像のアップロードに失敗しました。時間をおいて再度お試しください");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 「海外」選択時は国・地域名の入力を必須にする（VenueForm と同じ担保。
    // CreateSpotInput だけでは「未選択」と「海外選択・未入力」を区別できないため）
    if (isOverseas && !values.prefecture.trim()) {
      setErrors({ prefecture: "国・地域名を入力してください" });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await onSubmit(toSubmitValues(values));
      if (result.errors) {
        setErrors(toErrorMap(result.errors));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormErrorBanner message={errors._form} />

      <SpotLocationSection
        isOverseas={isOverseas}
        name={values.name}
        prefecture={values.prefecture}
        address={values.address}
        latitude={values.latitude}
        longitude={values.longitude}
        googleMapsUrl={values.googleMapsUrl}
        errors={errors}
        onPlaceSelect={handlePlaceSelect}
        onNameChange={(value) => update("name", value)}
        onPrefectureSelect={handlePrefectureSelect}
        onOverseasPrefectureChange={(value) => update("prefecture", value)}
        onAddressChange={(value) => update("address", value)}
        onLatitudeChange={(value) => update("latitude", value)}
        onLongitudeChange={(value) => update("longitude", value)}
        onGoogleMapsUrlChange={(value) => update("googleMapsUrl", value)}
      />

      <Textarea
        id="description"
        label="説明"
        value={values.description}
        onChange={(e) => update("description", e.target.value)}
        error={errors.description}
      />

      <SpotAppearancesSection
        appearances={values.appearances}
        masters={masters}
        errors={errors}
        onAdd={addAppearance}
        onUpdate={updateAppearance}
        onRemove={removeAppearance}
        onSourceTypeChange={handleSourceTypeChange}
        onToggleMember={toggleAppearanceMember}
      />

      <SpotPhotosSection
        photos={values.photos}
        errors={errors}
        isUploading={isUploadingPhoto}
        uploadError={photoUploadError}
        onFileChange={handlePhotoFileChange}
        onCaptionChange={updatePhotoCaption}
        onRemove={removePhoto}
        onMoveUp={(key) => movePhoto(key, -1)}
        onMoveDown={(key) => movePhoto(key, 1)}
      />

      <Button
        type="submit"
        disabled={isSubmitting || isUploadingPhoto}
        className="w-full"
      >
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
