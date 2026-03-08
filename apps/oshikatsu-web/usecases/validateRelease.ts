import type { CreateReleaseInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import { RELEASE_TYPES } from "@/types/release";
import { isValidDateString } from "@/lib/validation";
import { isReleaseArtworkPath } from "@/lib/releaseImage";

function isReleaseType(value: string): boolean {
  return (RELEASE_TYPES as readonly string[]).includes(value);
}

export function validateRelease(input: CreateReleaseInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.title.trim()) {
    errors.push({ field: "title", message: "タイトルを入力してください" });
  } else if (input.title.length > 200) {
    errors.push({ field: "title", message: "タイトルは200文字以内で入力してください" });
  }

  if (!input.groupId) {
    errors.push({ field: "groupId", message: "グループを選択してください" });
  }

  if (!input.releaseType) {
    errors.push({ field: "releaseType", message: "リリースタイプを選択してください" });
  } else if (!isReleaseType(input.releaseType)) {
    errors.push({ field: "releaseType", message: "無効なリリースタイプです" });
  }

  if (input.releaseType === "single" || input.releaseType === "album") {
    if (!input.numbering) {
      errors.push({
        field: "numbering",
        message: "シングル/アルバムではナンバリングを入力してください",
      });
    } else {
      const numbering = Number(input.numbering);
      if (!Number.isInteger(numbering) || numbering <= 0) {
        errors.push({
          field: "numbering",
          message: "ナンバリングは1以上の整数で入力してください",
        });
      }
    }
  } else if (input.numbering) {
    errors.push({
      field: "numbering",
      message: "このリリースタイプではナンバリングを入力できません",
    });
  }

  if (input.releaseDate && !isValidDateString(input.releaseDate)) {
    errors.push({ field: "releaseDate", message: "リリース日はYYYY-MM-DD形式で入力してください" });
  }

  if (input.artworkPath && !isReleaseArtworkPath(input.artworkPath)) {
    errors.push({
      field: "artworkPath",
      message: "アートワークはreleases/配下のStorage object path形式で入力してください",
    });
  }

  if (input.artworkPath.length > 500) {
    errors.push({ field: "artworkPath", message: "アートワークは500文字以内で入力してください" });
  }

  for (let i = 0; i < input.bonusVideos.length; i++) {
    const bonus = input.bonusVideos[i];
    if (!bonus.edition.trim()) {
      errors.push({
        field: `bonusVideos.${i}.edition`,
        message: "版種を入力してください",
      });
    } else if (bonus.edition.length > 100) {
      errors.push({
        field: `bonusVideos.${i}.edition`,
        message: "版種は100文字以内で入力してください",
      });
    }

    if (!bonus.title.trim()) {
      errors.push({
        field: `bonusVideos.${i}.title`,
        message: "特典映像タイトルを入力してください",
      });
    } else if (bonus.title.length > 200) {
      errors.push({
        field: `bonusVideos.${i}.title`,
        message: "特典映像タイトルは200文字以内で入力してください",
      });
    }

    if (bonus.description.length > 1000) {
      errors.push({
        field: `bonusVideos.${i}.description`,
        message: "説明は1000文字以内で入力してください",
      });
    }
  }

  const seenMemberIds = new Set<string>();
  for (const memberId of input.participantMemberIds) {
    if (seenMemberIds.has(memberId)) {
      errors.push({
        field: "participantMemberIds",
        message: "同じ参加メンバーが重複しています",
      });
      break;
    }
    seenMemberIds.add(memberId);
  }

  return errors;
}
