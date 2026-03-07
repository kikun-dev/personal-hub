"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Group } from "@/types/group";
import type {
  CreateMemberInput,
  CreateMemberGroupInput,
  CreateMemberSnsInput,
  CreateMemberRegularWorkInput,
  MemberImageUploadInput,
} from "@/types/member";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  BLOOD_TYPES,
  SNS_TYPES,
  REGULAR_WORK_TYPES,
} from "@/lib/constants";
import { calculateZodiac } from "@/lib/zodiac";
import {
  MEMBER_IMAGE_ALLOWED_MIME_TYPES,
  MEMBER_IMAGE_MAX_BYTES,
  isAllowedMemberImageMimeType,
  resolveMemberImageSrc,
} from "@/lib/memberImage";

type GroupWithKey = CreateMemberGroupInput & { _key: string };
type SnsWithKey = CreateMemberSnsInput & { _key: string };
type RegularWorkWithKey = CreateMemberRegularWorkInput & { _key: string };

type FormValues = Omit<
  CreateMemberInput,
  "groups" | "sns" | "regularWorks"
> & {
  groups: GroupWithKey[];
  sns: SnsWithKey[];
  regularWorks: RegularWorkWithKey[];
};

type MemberFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateMemberInput;
  groups: Group[];
  onSubmit: (
    values: CreateMemberInput,
    imageFile?: MemberImageUploadInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

const CIRCLED_NUMBERS = [
  "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
  "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
] as const;

function withGroupKey(group: CreateMemberGroupInput): GroupWithKey {
  return { ...group, _key: crypto.randomUUID() };
}

function withSnsKey(sns: CreateMemberSnsInput): SnsWithKey {
  return { ...sns, _key: crypto.randomUUID() };
}

function withRegularWorkKey(
  work: CreateMemberRegularWorkInput
): RegularWorkWithKey {
  return { ...work, _key: crypto.randomUUID() };
}

function getDefaultValues(): FormValues {
  return {
    nameJa: "",
    nameKana: "",
    nameEn: "",
    dateOfBirth: "",
    bloodType: "",
    callName: "",
    penlightColor1: "",
    penlightColor2: "",
    heightCm: "",
    hometown: "",
    imageUrl: "",
    blogUrl: "",
    blogHashtag: "",
    talkAppName: "",
    talkAppUrl: "",
    talkAppHashtag: "",
    groups: [
      withGroupKey({ groupId: "", generation: "", joinedAt: "", graduatedAt: "" }),
    ],
    sns: [],
    regularWorks: [],
  };
}

function toFormValues(input: CreateMemberInput): FormValues {
  return {
    ...input,
    groups: input.groups.map(withGroupKey),
    sns: input.sns.map(withSnsKey),
    regularWorks: input.regularWorks.map(withRegularWorkKey),
  };
}

function toSubmitValues(form: FormValues): CreateMemberInput {
  return {
    ...form,
    groups: form.groups.map((g) => ({
      groupId: g.groupId,
      generation: g.generation,
      joinedAt: g.joinedAt,
      graduatedAt: g.graduatedAt,
    })),
    sns: form.sns.map((sns) => ({
      snsType: sns.snsType,
      displayName: sns.displayName,
      url: sns.url,
      hashtag: sns.hashtag,
    })),
    regularWorks: form.regularWorks.map((work) => ({
      workType: work.workType,
      name: work.name,
      startDate: work.startDate,
      endDate: work.endDate,
    })),
  };
}

function buildOrderedLabel(index: number, label: string): string {
  const prefix = CIRCLED_NUMBERS[index] ?? `${index + 1}.`;
  return `${prefix}${label}`;
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

export function MemberForm({
  mode,
  initialValues,
  groups,
  onSubmit,
}: MemberFormProps) {
  const [values, setValues] = useState<FormValues>(
    () => (initialValues ? toFormValues(initialValues) : getDefaultValues())
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<string | null>(null);

  const mainGroupId = values.groups[0]?.groupId ?? "";
  const mainGroup = groups.find((group) => group.id === mainGroupId);
  const penlightOptions = (mainGroup?.penlightColors ?? []).map((color, index) => ({
    value: color.name,
    label: buildOrderedLabel(index, color.name),
  }));

  const zodiacPreview = values.dateOfBirth
    ? calculateZodiac(values.dateOfBirth) ?? ""
    : "";
  const savedImageSrc = resolveMemberImageSrc(values.imageUrl);
  const previewImageSrc = pendingImagePreviewUrl ?? savedImageSrc;

  useEffect(() => {
    return () => {
      if (pendingImagePreviewUrl) {
        URL.revokeObjectURL(pendingImagePreviewUrl);
      }
    };
  }, [pendingImagePreviewUrl]);

  const generationOptions = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    const maxGeneration = group?.maxGeneration ?? 20;
    return Array.from({ length: maxGeneration }, (_, i) => ({
      value: String(i + 1),
      label: `${i + 1}期`,
    }));
  };

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

  const updateGroup = (
    index: number,
    field: keyof CreateMemberGroupInput,
    value: string
  ) => {
    setValues((prev) => {
      const newGroups = [...prev.groups];
      newGroups[index] = { ...newGroups[index], [field]: value };
      if (field === "groupId" && newGroups[index].generation) {
        const options = generationOptions(value);
        if (!options.some((option) => option.value === newGroups[index].generation)) {
          newGroups[index].generation = "";
        }
      }

      if (field === "groupId" && index === 0) {
        return {
          ...prev,
          groups: newGroups,
          penlightColor1: "",
          penlightColor2: "",
        };
      }
      return { ...prev, groups: newGroups };
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next[`groups.${index}.${field}`];
      delete next["groups"];
      if (field === "groupId" && index === 0) {
        delete next.penlightColor1;
        delete next.penlightColor2;
      }
      return next;
    });
  };

  const addGroup = () => {
    setValues((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        withGroupKey({ groupId: "", generation: "", joinedAt: "", graduatedAt: "" }),
      ],
    }));
  };

  const removeGroup = (index: number) => {
    setValues((prev) => {
      const nextGroups = prev.groups.filter((_, i) => i !== index);
      if (index === 0) {
        return {
          ...prev,
          groups: nextGroups,
          penlightColor1: "",
          penlightColor2: "",
        };
      }
      return { ...prev, groups: nextGroups };
    });
  };

  const updateSns = (
    index: number,
    field: keyof CreateMemberSnsInput,
    value: string
  ) => {
    setValues((prev) => {
      const next = [...prev.sns];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, sns: next };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`sns.${index}.${field}`];
      return next;
    });
  };

  const addSns = () => {
    setValues((prev) => ({
      ...prev,
      sns: [
        ...prev.sns,
        withSnsKey({ snsType: "x", displayName: "", url: "", hashtag: "" }),
      ],
    }));
  };

  const removeSns = (index: number) => {
    setValues((prev) => ({
      ...prev,
      sns: prev.sns.filter((_, i) => i !== index),
    }));
  };

  const updateRegularWork = (
    index: number,
    field: keyof CreateMemberRegularWorkInput,
    value: string
  ) => {
    setValues((prev) => {
      const next = [...prev.regularWorks];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, regularWorks: next };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`regularWorks.${index}.${field}`];
      return next;
    });
  };

  const addRegularWork = () => {
    setValues((prev) => ({
      ...prev,
      regularWorks: [
        ...prev.regularWorks,
        withRegularWorkKey({
          workType: "tv",
          name: "",
          startDate: "",
          endDate: "",
        }),
      ],
    }));
  };

  const removeRegularWork = (index: number) => {
    setValues((prev) => ({
      ...prev,
      regularWorks: prev.regularWorks.filter((_, i) => i !== index),
    }));
  };

  const clearPendingImage = () => {
    if (pendingImagePreviewUrl) {
      URL.revokeObjectURL(pendingImagePreviewUrl);
    }
    setPendingImagePreviewUrl(null);
    setPendingImageFile(null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedMemberImageMimeType(file.type)) {
      clearPendingImage();
      setErrors((prev) => ({
        ...prev,
        imageUrl: `画像形式は ${MEMBER_IMAGE_ALLOWED_MIME_TYPES.join(", ")} のみ対応しています`,
      }));
      return;
    }

    if (file.size > MEMBER_IMAGE_MAX_BYTES) {
      clearPendingImage();
      setErrors((prev) => ({
        ...prev,
        imageUrl: `画像サイズは ${Math.floor(MEMBER_IMAGE_MAX_BYTES / (1024 * 1024))}MB 以下にしてください`,
      }));
      return;
    }

    if (pendingImagePreviewUrl) {
      URL.revokeObjectURL(pendingImagePreviewUrl);
    }
    setPendingImageFile(file);
    setPendingImagePreviewUrl(URL.createObjectURL(file));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.imageUrl;
      return next;
    });
  };

  const clearImage = () => {
    clearPendingImage();
    update("imageUrl", "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    let imageFile: MemberImageUploadInput | undefined;

    try {
      const submitValues = toSubmitValues(values);
      if (pendingImageFile) {
        setIsUploadingImage(true);
        try {
          const base64Data = await readFileAsBase64(pendingImageFile);
          imageFile = {
            fileName: pendingImageFile.name,
            mimeType: pendingImageFile.type,
            size: pendingImageFile.size,
            base64Data,
          };
        } catch {
          setErrors({
            imageUrl: "画像アップロードに失敗しました。時間をおいて再度お試しください",
          });
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const result = await onSubmit(submitValues, imageFile);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors._form && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errors._form}
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-foreground/10 p-4">
        <h2 className="text-sm font-medium text-foreground/70">プロフィール情報</h2>
        <Input
          id="nameJa"
          label="名前（日本語）*"
          value={values.nameJa}
          onChange={(e) => update("nameJa", e.target.value)}
          error={errors.nameJa}
        />
        <Input
          id="nameKana"
          label="名前（かな）*"
          value={values.nameKana}
          onChange={(e) => update("nameKana", e.target.value)}
          error={errors.nameKana}
        />
        <Input
          id="nameEn"
          label="名前（英語）"
          value={values.nameEn}
          onChange={(e) => update("nameEn", e.target.value)}
          error={errors.nameEn}
        />
        <Input
          id="hometown"
          label="出身地"
          value={values.hometown}
          onChange={(e) => update("hometown", e.target.value)}
          error={errors.hometown}
        />
        <Input
          id="dateOfBirth"
          label="生年月日"
          type="date"
          value={values.dateOfBirth}
          onChange={(e) => update("dateOfBirth", e.target.value)}
          error={errors.dateOfBirth}
        />
        <Input
          id="zodiacPreview"
          label="星座（自動計算）"
          value={zodiacPreview}
          readOnly
        />
        <Select
          id="bloodType"
          label="血液型"
          placeholder="選択してください"
          options={BLOOD_TYPES.map((bt) => ({
            value: bt,
            label: bt === "不明" ? "不明" : `${bt}型`,
          }))}
          value={values.bloodType}
          onChange={(e) => update("bloodType", e.target.value)}
          error={errors.bloodType}
        />
        <Input
          id="heightCm"
          label="身長 (cm)"
          type="number"
          value={values.heightCm}
          onChange={(e) => update("heightCm", e.target.value)}
          error={errors.heightCm}
        />
        <div>
          <label
            htmlFor="imageFile"
            className="mb-1 block text-sm font-medium text-foreground/70"
          >
            プロフィール画像
          </label>
          <input
            id="imageFile"
            type="file"
            accept={MEMBER_IMAGE_ALLOWED_MIME_TYPES.join(",")}
            onChange={handleImageFileChange}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm ${
              errors.imageUrl ? "border-red-400" : "border-foreground/10"
            }`}
          />
          <p className="mt-1 text-xs text-foreground/50">
            JPEG / PNG / WebP、最大 {Math.floor(MEMBER_IMAGE_MAX_BYTES / (1024 * 1024))}
            MB
          </p>
          {errors.imageUrl && <p className="mt-1 text-xs text-red-500">{errors.imageUrl}</p>}

          {previewImageSrc && (
            <div className="mt-3 space-y-2 rounded-lg border border-foreground/10 p-3">
              <Image
                src={previewImageSrc}
                alt="プロフィール画像プレビュー"
                width={160}
                height={160}
                unoptimized={previewImageSrc.startsWith("blob:")}
                className="h-40 w-40 rounded-lg object-cover"
              />
              <Button type="button" variant="ghost" onClick={clearImage}>
                画像を外す
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-foreground/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground/70">所属グループ情報</h2>
          <Button type="button" variant="ghost" onClick={addGroup}>
            + 追加
          </Button>
        </div>
        {errors.groups && <p className="text-xs text-red-500">{errors.groups}</p>}

        {values.groups.map((groupValue, i) => (
          <div
            key={groupValue._key}
            className="space-y-3 rounded-lg border border-foreground/10 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/50">グループ {i + 1}</span>
              {values.groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroup(i)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  削除
                </button>
              )}
            </div>

            <Select
              id={`group-${i}`}
              label="グループ"
              placeholder="選択してください"
              options={groups.map((group) => ({ value: group.id, label: group.nameJa }))}
              value={groupValue.groupId}
              onChange={(e) => updateGroup(i, "groupId", e.target.value)}
              error={errors[`groups.${i}.groupId`]}
            />

            <Select
              id={`generation-${i}`}
              label="期生"
              placeholder={groupValue.groupId ? "選択してください" : "先にグループを選択"}
              options={generationOptions(groupValue.groupId)}
              value={groupValue.generation}
              onChange={(e) => updateGroup(i, "generation", e.target.value)}
              error={errors[`groups.${i}.generation`]}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                id={`joinedAt-${i}`}
                label="加入日"
                type="date"
                value={groupValue.joinedAt}
                onChange={(e) => updateGroup(i, "joinedAt", e.target.value)}
              />
              <Input
                id={`graduatedAt-${i}`}
                label="卒業日"
                type="date"
                value={groupValue.graduatedAt}
                onChange={(e) => updateGroup(i, "graduatedAt", e.target.value)}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-lg border border-foreground/10 p-4">
        <h2 className="text-sm font-medium text-foreground/70">ライブ情報</h2>
        <Input
          id="callName"
          label="コール名"
          value={values.callName}
          onChange={(e) => update("callName", e.target.value)}
          error={errors.callName}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            id="penlightColor1"
            label="サイリウムカラー1"
            placeholder={mainGroup ? "選択してください" : "先頭の所属グループを選択してください"}
            options={penlightOptions}
            value={values.penlightColor1}
            onChange={(e) => update("penlightColor1", e.target.value)}
            error={errors.penlightColor1}
          />
          <Select
            id="penlightColor2"
            label="サイリウムカラー2"
            placeholder={mainGroup ? "選択してください" : "先頭の所属グループを選択してください"}
            options={penlightOptions}
            value={values.penlightColor2}
            onChange={(e) => update("penlightColor2", e.target.value)}
            error={errors.penlightColor2}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-foreground/10 p-4">
        <h2 className="text-sm font-medium text-foreground/70">発信情報</h2>
        <Input
          id="blogUrl"
          label="ブログ URL"
          type="url"
          value={values.blogUrl}
          onChange={(e) => update("blogUrl", e.target.value)}
          error={errors.blogUrl}
        />
        <Input
          id="blogHashtag"
          label="ブログ ハッシュタグ"
          placeholder="#example"
          value={values.blogHashtag}
          onChange={(e) => update("blogHashtag", e.target.value)}
          error={errors.blogHashtag}
        />

        <Input
          id="talkAppName"
          label="トークアプリ名"
          value={values.talkAppName}
          onChange={(e) => update("talkAppName", e.target.value)}
          error={errors.talkAppName}
        />
        <Input
          id="talkAppUrl"
          label="トークアプリ URL"
          type="url"
          value={values.talkAppUrl}
          onChange={(e) => update("talkAppUrl", e.target.value)}
          error={errors.talkAppUrl}
        />
        <Input
          id="talkAppHashtag"
          label="トークアプリ ハッシュタグ"
          placeholder="#example"
          value={values.talkAppHashtag}
          onChange={(e) => update("talkAppHashtag", e.target.value)}
          error={errors.talkAppHashtag}
        />

        <div className="space-y-3 rounded-lg border border-foreground/10 p-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground/70">SNS</label>
            <Button type="button" variant="ghost" onClick={addSns}>
              + 追加
            </Button>
          </div>

          {values.sns.map((sns, i) => (
            <div key={sns._key} className="space-y-3 rounded-lg border border-foreground/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/50">SNS {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeSns(i)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  削除
                </button>
              </div>
              <Select
                id={`snsType-${i}`}
                label="種類"
                placeholder="選択してください"
                options={SNS_TYPES.map((type) => ({ value: type.value, label: type.label }))}
                value={sns.snsType}
                onChange={(e) => updateSns(i, "snsType", e.target.value)}
                error={errors[`sns.${i}.snsType`]}
              />
              <Input
                id={`snsDisplayName-${i}`}
                label="表示名"
                value={sns.displayName}
                onChange={(e) => updateSns(i, "displayName", e.target.value)}
                error={errors[`sns.${i}.displayName`]}
              />
              <Input
                id={`snsUrl-${i}`}
                label="URL"
                type="url"
                value={sns.url}
                onChange={(e) => updateSns(i, "url", e.target.value)}
                error={errors[`sns.${i}.url`]}
              />
              <Input
                id={`snsHashtag-${i}`}
                label="ハッシュタグ"
                placeholder="#example"
                value={sns.hashtag}
                onChange={(e) => updateSns(i, "hashtag", e.target.value)}
                error={errors[`sns.${i}.hashtag`]}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-foreground/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground/70">レギュラー仕事</h2>
          <Button type="button" variant="ghost" onClick={addRegularWork}>
            + 追加
          </Button>
        </div>

        {values.regularWorks.map((work, i) => (
          <div key={work._key} className="space-y-3 rounded-lg border border-foreground/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/50">仕事 {i + 1}</span>
              <button
                type="button"
                onClick={() => removeRegularWork(i)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                削除
              </button>
            </div>
            <Select
              id={`workType-${i}`}
              label="種別"
              placeholder="選択してください"
              options={REGULAR_WORK_TYPES.map((type) => ({ value: type.value, label: type.label }))}
              value={work.workType}
              onChange={(e) => updateRegularWork(i, "workType", e.target.value)}
              error={errors[`regularWorks.${i}.workType`]}
            />
            <Input
              id={`workName-${i}`}
              label="名前"
              value={work.name}
              onChange={(e) => updateRegularWork(i, "name", e.target.value)}
              error={errors[`regularWorks.${i}.name`]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id={`workStartDate-${i}`}
                label="開始日"
                type="date"
                value={work.startDate}
                onChange={(e) => updateRegularWork(i, "startDate", e.target.value)}
                error={errors[`regularWorks.${i}.startDate`]}
              />
              <Input
                id={`workEndDate-${i}`}
                label="終了日"
                type="date"
                value={work.endDate}
                onChange={(e) => updateRegularWork(i, "endDate", e.target.value)}
                error={errors[`regularWorks.${i}.endDate`]}
              />
            </div>
          </div>
        ))}
      </section>

      <Button type="submit" disabled={isSubmitting || isUploadingImage} className="w-full">
        {isUploadingImage
          ? "画像をアップロード中..."
          : isSubmitting
            ? "保存中..."
            : mode === "create"
              ? "登録する"
              : "更新する"}
      </Button>
    </form>
  );
}
