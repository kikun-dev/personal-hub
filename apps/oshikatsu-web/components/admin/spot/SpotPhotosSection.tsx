"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/Input";
import {
  SPOT_PHOTO_ALLOWED_MIME_TYPES,
  SPOT_PHOTO_MAX_BYTES,
  SPOT_PHOTO_MAX_COUNT,
  resolveSpotPhotoSrc,
} from "@/lib/spotPhoto";

export type FormSpotPhoto = {
  _key: string;
  imagePath: string;
  caption: string;
};

type SpotPhotosSectionProps = {
  photos: FormSpotPhoto[];
  errors: Record<string, string>;
  isUploading: boolean;
  uploadError: string | null;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onCaptionChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
};

export function SpotPhotosSection({
  photos,
  errors,
  isUploading,
  uploadError,
  onFileChange,
  onCaptionChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SpotPhotosSectionProps) {
  return (
    <section className="space-y-3">
      <label className="block text-sm font-medium text-foreground/70">写真</label>
      {errors.photos && <p className="text-xs text-red-500">{errors.photos}</p>}

      <div className="space-y-3">
        {photos.map((photo, index) => {
          const src = resolveSpotPhotoSrc(photo.imagePath);
          return (
            <div
              key={photo._key}
              className="flex gap-3 rounded-lg border border-foreground/10 p-3"
            >
              {src && (
                <Image
                  src={src}
                  alt={photo.caption || "スポット写真"}
                  width={96}
                  height={96}
                  className="h-24 w-24 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 space-y-2">
                <Input
                  id={`photo-caption-${photo._key}`}
                  label="キャプション"
                  value={photo.caption}
                  onChange={(e) => onCaptionChange(photo._key, e.target.value)}
                  error={errors[`photos[${index}].caption`]}
                />
                {errors[`photos[${index}].imagePath`] && (
                  <p className="text-xs text-red-500">
                    {errors[`photos[${index}].imagePath`]}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onMoveUp(photo._key)}
                    disabled={index === 0}
                    className="text-xs text-foreground/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↑ 上へ
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDown(photo._key)}
                    disabled={index === photos.length - 1}
                    className="text-xs text-foreground/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↓ 下へ
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(photo._key)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {photos.length === 0 && (
          <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
            写真は未登録です
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="spotPhotoFile"
          className="mb-1 block text-sm font-medium text-foreground/70"
        >
          写真を追加
        </label>
        <input
          id="spotPhotoFile"
          type="file"
          accept={SPOT_PHOTO_ALLOWED_MIME_TYPES.join(",")}
          onChange={onFileChange}
          disabled={isUploading}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
            uploadError ? "border-red-400" : "border-foreground/10"
          }`}
        />
        <p className="mt-1 text-xs text-foreground/50">
          JPEG / PNG / WebP、最大 {Math.floor(SPOT_PHOTO_MAX_BYTES / (1024 * 1024))}
          MB、最大{SPOT_PHOTO_MAX_COUNT}枚。選択すると即座にアップロードされます
        </p>
        {isUploading && (
          <p className="mt-1 text-xs text-foreground/50">アップロード中...</p>
        )}
        {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
      </div>
    </section>
  );
}

export function withGeneratedPhotoKey(
  photo: Omit<FormSpotPhoto, "_key">
): FormSpotPhoto {
  return { ...photo, _key: crypto.randomUUID() };
}

