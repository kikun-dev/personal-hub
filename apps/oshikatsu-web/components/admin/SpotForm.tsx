"use client";

import { useState } from "react";
import type { ValidationError } from "@/types/errors";
import type { EventOption } from "@/types/event";
import { getSongVideoTypeLabel } from "@/types/song";
import type { SongVideoOption } from "@/types/song";
import {
  SPOT_SOURCE_TYPES,
  SPOT_SOURCE_TYPE_LABELS,
  type CreateSpotAppearanceInput,
  type CreateSpotInput,
  type SpotPhotoUploadInput,
} from "@/types/spot";
import type { getSpotFormMasterData } from "@/usecases/readOrbitAdminData";
import { PREFECTURES, isPrefecture } from "@/lib/prefectures";
import {
  addKeyedItem,
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
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { toErrorMap, useAdminForm } from "@/hooks/useAdminForm";
import {
  SpotPlaceSearch,
  type SpotPlaceSearchResult,
} from "@/components/admin/SpotPlaceSearch";
import {
  SpotPhotosSection,
  withGeneratedPhotoKey,
  type FormSpotPhoto,
} from "@/components/admin/spot/SpotPhotosSection";

// readOrbitAdminData（サーバー専用の usecase）から型だけを取り出す。
// `import type` のためコンパイル時に消去され、クライアントバンドルに
// サーバー専用コードが含まれることはない。
export type SpotFormMasterData = Awaited<ReturnType<typeof getSpotFormMasterData>>;

type AppearanceField = CreateSpotAppearanceInput & { _key: string };

type FormValues = Omit<CreateSpotInput, "appearances" | "photos"> & {
  appearances: AppearanceField[];
  photos: FormSpotPhoto[];
};

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

const OVERSEAS_VALUE = "__overseas__";
const inputClass =
  "w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20";

function getDefaultAppearance(): CreateSpotAppearanceInput {
  return {
    sourceType: "",
    groupId: "",
    trackId: "",
    videoId: "",
    eventId: "",
    liveId: "",
    subtypeName: "",
    note: "",
    linkUrl: "",
    memberIds: [],
  };
}

function getDefaultValues(): FormValues {
  return {
    name: "",
    description: "",
    latitude: "",
    longitude: "",
    address: "",
    prefecture: "",
    googlePlaceId: "",
    googleMapsUrl: "",
    // 出来事1件以上必須（#286）のため、create の初期値に空行を1件入れておく。
    appearances: [withGeneratedKey(getDefaultAppearance())],
    photos: [],
  };
}

function toFormValues(input: CreateSpotInput): FormValues {
  return {
    ...input,
    appearances: input.appearances.map((appearance) =>
      withGeneratedKey(appearance)
    ),
    photos: input.photos.map(withGeneratedPhotoKey),
  };
}

function toSubmitValues(values: FormValues): CreateSpotInput {
  return {
    ...values,
    appearances: values.appearances.map((appearance) => ({
      sourceType: appearance.sourceType,
      groupId: appearance.groupId,
      trackId: appearance.trackId,
      videoId: appearance.videoId,
      eventId: appearance.eventId,
      liveId: appearance.liveId,
      subtypeName: appearance.subtypeName,
      note: appearance.note,
      linkUrl: appearance.linkUrl,
      memberIds: appearance.memberIds,
    })),
    photos: values.photos.map((photo) => ({
      imagePath: photo.imagePath,
      caption: photo.caption,
    })),
  };
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

function formatVideoOptionLabel(option: SongVideoOption): string {
  const typeLabel = getSongVideoTypeLabel(option.videoType);
  const publishedLabel = option.publishedOn ? `（${option.publishedOn}）` : "";
  return `${option.trackTitle} / ${typeLabel}${publishedLabel}`;
}

function formatEventOptionLabel(option: EventOption): string {
  return `${option.title}（${option.date}）`;
}

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

  const selectValue = isOverseas
    ? OVERSEAS_VALUE
    : isPrefecture(values.prefecture)
      ? values.prefecture
      : "";

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
    setValues((prev) => {
      const index = prev.photos.findIndex((p) => p._key === key);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.photos.length) {
        return prev;
      }
      const nextPhotos = prev.photos.slice();
      [nextPhotos[index], nextPhotos[targetIndex]] = [
        nextPhotos[targetIndex],
        nextPhotos[index],
      ];
      return { ...prev, photos: nextPhotos };
    });
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

      <SpotPlaceSearch onSelect={handlePlaceSelect} />

      <Input
        id="name"
        label="スポット名*"
        value={values.name}
        onChange={(e) => update("name", e.target.value)}
        error={errors.name}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          都道府県
        </label>
        <select
          value={selectValue}
          onChange={(e) => handlePrefectureSelect(e.target.value)}
          className={inputClass}
        >
          <option value="">未選択</option>
          {PREFECTURES.map((prefecture) => (
            <option key={prefecture} value={prefecture}>
              {prefecture}
            </option>
          ))}
          <option value={OVERSEAS_VALUE}>海外</option>
        </select>
        {isOverseas && (
          <input
            value={values.prefecture}
            onChange={(e) => update("prefecture", e.target.value)}
            placeholder="国・地域名（例: 台湾）"
            className={`mt-2 ${inputClass}`}
          />
        )}
        {errors.prefecture && (
          <p className="mt-1 text-xs text-red-500">{errors.prefecture}</p>
        )}
      </div>

      <Input
        id="address"
        label="住所"
        value={values.address}
        onChange={(e) => update("address", e.target.value)}
        error={errors.address}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="latitude"
          label="緯度*"
          value={values.latitude}
          onChange={(e) => update("latitude", e.target.value)}
          error={errors.latitude}
        />
        <Input
          id="longitude"
          label="経度*"
          value={values.longitude}
          onChange={(e) => update("longitude", e.target.value)}
          error={errors.longitude}
        />
      </div>

      <Input
        id="googleMapsUrl"
        label="Googleマップのリンク"
        value={values.googleMapsUrl}
        onChange={(e) => update("googleMapsUrl", e.target.value)}
        error={errors.googleMapsUrl}
      />

      <Textarea
        id="description"
        label="説明"
        value={values.description}
        onChange={(e) => update("description", e.target.value)}
        error={errors.description}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground/70">
            出来事*
          </label>
          <Button type="button" variant="secondary" onClick={addAppearance}>
            出来事を追加
          </Button>
        </div>
        {errors.appearances && (
          <p className="text-xs text-red-500">{errors.appearances}</p>
        )}

        {values.appearances.map((appearance, index) => {
          const fieldError = (field: string) =>
            errors[`appearances[${index}].${field}`];

          return (
            <div
              key={appearance._key}
              className="space-y-3 rounded-lg border border-foreground/10 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/70">
                  出来事 {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeAppearance(appearance._key)}
                  className="text-sm text-red-500 hover:underline"
                >
                  削除
                </button>
              </div>

              <Select
                id={`appearance-${appearance._key}-groupId`}
                label="グループ*"
                placeholder="選択してください"
                options={masters.groups.map((group) => ({
                  value: group.id,
                  label: group.nameJa,
                }))}
                value={appearance.groupId}
                onChange={(e) =>
                  updateAppearance(appearance._key, { groupId: e.target.value })
                }
                error={fieldError("groupId")}
              />

              <Select
                id={`appearance-${appearance._key}-sourceType`}
                label="出典種別*"
                placeholder="選択してください"
                options={SPOT_SOURCE_TYPES.map((type) => ({
                  value: type,
                  label: SPOT_SOURCE_TYPE_LABELS[type],
                }))}
                value={appearance.sourceType}
                onChange={(e) =>
                  handleSourceTypeChange(appearance._key, e.target.value)
                }
                error={fieldError("sourceType")}
              />

              {appearance.sourceType === "mv" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground/70">
                    出典（楽曲）
                  </label>
                  <Combobox
                    value={appearance.trackId}
                    onChange={(trackId) =>
                      updateAppearance(appearance._key, { trackId })
                    }
                    options={masters.songOptions.map((option) => ({
                      value: option.id,
                      label: option.title,
                    }))}
                    ariaLabel="楽曲を検索"
                    placeholder="曲名で検索"
                    emptyLabel="未設定"
                  />
                  {fieldError("trackId") && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldError("trackId")}
                    </p>
                  )}
                </div>
              )}

              {appearance.sourceType === "video" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground/70">
                    出典（関連動画）
                  </label>
                  <Combobox
                    value={appearance.videoId}
                    onChange={(videoId) =>
                      updateAppearance(appearance._key, { videoId })
                    }
                    options={masters.videoOptions.map((option) => ({
                      value: option.id,
                      label: formatVideoOptionLabel(option),
                    }))}
                    ariaLabel="関連動画を検索"
                    placeholder="曲名で検索"
                    emptyLabel="未設定"
                  />
                  {fieldError("videoId") && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldError("videoId")}
                    </p>
                  )}
                </div>
              )}

              {appearance.sourceType === "event" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground/70">
                    出典（イベント）
                  </label>
                  <Combobox
                    value={appearance.eventId}
                    onChange={(eventId) =>
                      updateAppearance(appearance._key, { eventId })
                    }
                    options={masters.eventOptions.map((option) => ({
                      value: option.id,
                      label: formatEventOptionLabel(option),
                    }))}
                    ariaLabel="イベントを検索"
                    placeholder="タイトルで検索"
                    emptyLabel="未設定"
                  />
                  {fieldError("eventId") && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldError("eventId")}
                    </p>
                  )}
                </div>
              )}

              {appearance.sourceType === "live" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground/70">
                    出典（ライブ）
                  </label>
                  <Combobox
                    value={appearance.liveId}
                    onChange={(liveId) =>
                      updateAppearance(appearance._key, { liveId })
                    }
                    options={masters.liveOptions.map((option) => ({
                      value: option.id,
                      label: option.name,
                    }))}
                    ariaLabel="ライブを検索"
                    placeholder="ライブ名で検索"
                    emptyLabel="未設定"
                  />
                  {fieldError("liveId") && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldError("liveId")}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor={`appearance-${appearance._key}-subtypeName`}
                  className="mb-1 block text-sm font-medium text-foreground/70"
                >
                  サブ種別
                </label>
                <input
                  id={`appearance-${appearance._key}-subtypeName`}
                  list={`appearance-${appearance._key}-subtypeName-options`}
                  value={appearance.subtypeName}
                  onChange={(e) =>
                    updateAppearance(appearance._key, {
                      subtypeName: e.target.value,
                    })
                  }
                  placeholder="例: あそぶだけ（候補になければ新規入力可）"
                  className={inputClass}
                />
                <datalist id={`appearance-${appearance._key}-subtypeName-options`}>
                  {masters.subtypeOptions
                    .filter((option) => option.sourceType === appearance.sourceType)
                    .map((option) => (
                      <option key={option.id} value={option.name} />
                    ))}
                </datalist>
                {fieldError("subtypeName") && (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldError("subtypeName")}
                  </p>
                )}
              </div>

              <Input
                id={`appearance-${appearance._key}-linkUrl`}
                label="リンク"
                value={appearance.linkUrl}
                onChange={(e) =>
                  updateAppearance(appearance._key, { linkUrl: e.target.value })
                }
                error={fieldError("linkUrl")}
              />

              <Textarea
                id={`appearance-${appearance._key}-note`}
                label="メモ"
                value={appearance.note}
                onChange={(e) =>
                  updateAppearance(appearance._key, { note: e.target.value })
                }
                error={fieldError("note")}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/70">
                  関連メンバー（任意）
                </label>
                {fieldError("memberIds") && (
                  <p className="mb-1 text-xs text-red-500">
                    {fieldError("memberIds")}
                  </p>
                )}
                <div className="max-h-48 overflow-y-auto rounded-lg border border-foreground/10 p-2">
                  {masters.members.map((member) => (
                    <label
                      key={member.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
                    >
                      <input
                        type="checkbox"
                        checked={appearance.memberIds.includes(member.id)}
                        onChange={() =>
                          toggleAppearanceMember(appearance._key, member.id)
                        }
                        className="rounded"
                      />
                      <span className="text-foreground">{member.nameJa}</span>
                      <span className="text-xs text-foreground/40">
                        {member.groupNames.join(", ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

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
