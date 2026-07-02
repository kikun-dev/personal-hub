"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import type { PersonOption } from "@/types/person";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  RELEASE_IMAGE_ALLOWED_MIME_TYPES,
  RELEASE_IMAGE_MAX_BYTES,
} from "@/lib/releaseImage";

type ReleaseArtworkSectionProps = {
  artworkPersonName: string;
  people: PersonOption[];
  errors: Record<string, string>;
  onArtworkPersonNameChange: (value: string) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  artworkPreviewSrc: string | null;
  pendingArtworkFile: File | null;
  onClearArtwork: () => void;
};

export function ReleaseArtworkSection({
  artworkPersonName,
  people,
  errors,
  onArtworkPersonNameChange,
  onFileChange,
  artworkPreviewSrc,
  pendingArtworkFile,
  onClearArtwork,
}: ReleaseArtworkSectionProps) {
  return (
    <div className="space-y-3 rounded-lg border border-foreground/10 p-4">
      <p className="text-sm font-medium text-foreground">収録曲アートワーク</p>

      <Input
        id="artworkPersonName"
        label="担当者"
        list="artwork-person-suggestions"
        value={artworkPersonName}
        onChange={(e) => onArtworkPersonNameChange(e.target.value)}
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
          onChange={onFileChange}
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
              <Button type="button" variant="ghost" onClick={onClearArtwork}>
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
  );
}
