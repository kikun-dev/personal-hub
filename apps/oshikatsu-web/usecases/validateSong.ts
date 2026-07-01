import type {
  CreateSongInput,
  SongCreditRole,
  SongVideoType,
} from "@/types/song";
import { SONG_VIDEO_TYPE_LABELS, SONG_VIDEO_TYPES, isSongLabel } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { isValidDateString, isValidHttpUrl } from "@/lib/validation";
import { isTrackCostumeImagePath } from "@/lib/releaseImage";
import { splitCreditNames } from "@/lib/songCredits";

const CREDIT_ROLE_FIELDS: Array<{ role: SongCreditRole; field: keyof CreateSongInput }> = [
  { role: "lyrics", field: "lyricsPeople" },
  { role: "music", field: "musicPeople" },
  { role: "arrangement", field: "arrangementPeople" },
  { role: "choreography", field: "choreographyPeople" },
];

function validateRelatedVideo(
  errors: ValidationError[],
  type: SongVideoType,
  video: CreateSongInput["videos"][SongVideoType]
): void {
  const label = SONG_VIDEO_TYPE_LABELS[type];
  const fieldPrefix = `videos.${type}`;
  const hasAnyField =
    video.url.trim() ||
    video.publishedOn.trim() ||
    video.memo.trim();

  if (!hasAnyField) return;

  if (!video.url.trim()) {
    errors.push({
      field: `${fieldPrefix}.url`,
      message: `${label}がある場合はリンクを入力してください`,
    });
  } else if (!isValidHttpUrl(video.url.trim())) {
    errors.push({
      field: `${fieldPrefix}.url`,
      message: `${label}リンクは有効なhttp(s) URLを入力してください`,
    });
  }

  if (video.publishedOn && !isValidDateString(video.publishedOn)) {
    errors.push({
      field: `${fieldPrefix}.publishedOn`,
      message: `${label}配信日はYYYY-MM-DD形式で入力してください`,
    });
  }

  if (video.memo.length > 1000) {
    errors.push({
      field: `${fieldPrefix}.memo`,
      message: `${label}メモは1000文字以内で入力してください`,
    });
  }
}

export function validateSong(input: CreateSongInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.title.trim()) {
    errors.push({ field: "title", message: "タイトルを入力してください" });
  } else if (input.title.length > 200) {
    errors.push({ field: "title", message: "タイトルは200文字以内で入力してください" });
  }

  if (!input.groupId) {
    errors.push({ field: "groupId", message: "楽曲グループを選択してください" });
  }

  // ラベルは任意。値が許容外ならエラー。期別のときは期（正の整数）が必須。
  if (input.label) {
    if (!isSongLabel(input.label)) {
      errors.push({ field: "label", message: "ラベルの値が不正です" });
    } else if (input.label === "generation") {
      const generationRaw = input.generation.trim();
      if (!generationRaw) {
        errors.push({ field: "generation", message: "期別曲は期を選択してください" });
      } else {
        const generation = Number(generationRaw);
        if (!Number.isInteger(generation) || generation <= 0) {
          errors.push({ field: "generation", message: "期は1以上の整数で指定してください" });
        }
      }
    }
  } else if (input.generation.trim()) {
    errors.push({ field: "generation", message: "期はラベルが期別のときのみ指定できます" });
  }

  if (input.releaseLinks.length === 0) {
    errors.push({ field: "releaseLinks", message: "1件以上のリリースを紐づけてください" });
  }

  const releaseIdSet = new Set<string>();
  for (let i = 0; i < input.releaseLinks.length; i++) {
    const link = input.releaseLinks[i];

    if (!link.releaseId) {
      errors.push({
        field: `releaseLinks.${i}.releaseId`,
        message: "リリースを選択してください",
      });
    } else if (releaseIdSet.has(link.releaseId)) {
      errors.push({
        field: "releaseLinks",
        message: "同じリリースを重複して紐づけることはできません",
      });
    }
    releaseIdSet.add(link.releaseId);

    // 曲順は任意。空欄なら末尾に自動採番される。入力時のみ検証する。
    const trackNumberRaw = link.trackNumber.trim();
    if (trackNumberRaw !== "") {
      const trackNumber = Number(trackNumberRaw);
      if (!Number.isInteger(trackNumber) || trackNumber <= 0) {
        errors.push({
          field: `releaseLinks.${i}.trackNumber`,
          message: "曲順は1以上の整数で入力してください",
        });
      }
    }
  }

  for (const { field } of CREDIT_ROLE_FIELDS) {
    const raw = input[field];
    if (typeof raw !== "string") continue;

    const names = splitCreditNames(raw);
    for (const name of names) {
      if (name.length > 100) {
        errors.push({
          field: String(field),
          message: "担当者名は100文字以内で入力してください",
        });
        break;
      }
    }
  }

  for (let i = 0; i < input.formationRows.length; i++) {
    const row = input.formationRows[i];
    const memberCount = Number(row.memberCount);

    if (!Number.isInteger(memberCount) || memberCount < 0) {
      errors.push({
        field: `formationRows.${i}.memberCount`,
        message: "列人数は0以上の整数で入力してください",
      });
      continue;
    }

    if (row.memberIds.length !== memberCount) {
      errors.push({
        field: `formationRows.${i}.memberIds`,
        message: "列人数と割当メンバー数を一致させてください",
      });
    }

    const seen = new Set<string>();
    for (const memberId of row.memberIds) {
      if (!memberId) {
        errors.push({
          field: `formationRows.${i}.memberIds`,
          message: "フォーメーションのメンバーを選択してください",
        });
        break;
      }
      if (seen.has(memberId)) {
        errors.push({
          field: `formationRows.${i}.memberIds`,
          message: "同じメンバーが同一列に重複しています",
        });
        break;
      }
      seen.add(memberId);
    }
  }

  const seenInFormation = new Set<string>();
  for (const row of input.formationRows) {
    for (const memberId of row.memberIds) {
      if (seenInFormation.has(memberId)) {
        errors.push({
          field: "formationRows",
          message: "同じメンバーを複数列に割り当てることはできません",
        });
        break;
      }
      seenInFormation.add(memberId);
    }
  }

  // センターは1列目(最前列)のメンバーから最大2人（Wセンター可）
  if (input.centerMemberIds.length > 0) {
    if (input.centerMemberIds.length > 2) {
      errors.push({
        field: "centerMemberIds",
        message: "センターは最大2人まで指定できます",
      });
    }

    const frontRowMemberIds = new Set(input.formationRows[0]?.memberIds ?? []);
    const hasInvalidCenter = input.centerMemberIds.some(
      (memberId) => !frontRowMemberIds.has(memberId)
    );
    if (hasInvalidCenter) {
      errors.push({
        field: "centerMemberIds",
        message: "センターは1列目のメンバーから選んでください",
      });
    }
  }

  const hasMvAnyField =
    input.mv.url.trim() ||
    input.mv.directorName.trim() ||
    input.mv.location.trim() ||
    input.mv.publishedOn.trim() ||
    input.mv.memo.trim();

  if (hasMvAnyField) {
    if (!input.mv.url.trim()) {
      errors.push({ field: "mv.url", message: "MVがある場合はリンクを入力してください" });
    } else if (!isValidHttpUrl(input.mv.url.trim())) {
      errors.push({ field: "mv.url", message: "MVリンクは有効なhttp(s) URLを入力してください" });
    }

    if (input.mv.publishedOn && !isValidDateString(input.mv.publishedOn)) {
      errors.push({
        field: "mv.publishedOn",
        message: "MV配信日はYYYY-MM-DD形式で入力してください",
      });
    }

    if (input.mv.directorName.length > 100) {
      errors.push({
        field: "mv.directorName",
        message: "MV監督名は100文字以内で入力してください",
      });
    }

    if (input.mv.location.length > 200) {
      errors.push({
        field: "mv.location",
        message: "ロケ地は200文字以内で入力してください",
      });
    }

    if (input.mv.memo.length > 1000) {
      errors.push({
        field: "mv.memo",
        message: "MVメモは1000文字以内で入力してください",
      });
    }
  }

  for (const type of SONG_VIDEO_TYPES) {
    validateRelatedVideo(errors, type, input.videos[type]);
  }

  for (let i = 0; i < input.costumes.length; i++) {
    const costume = input.costumes[i];

    if (!costume.stylistName.trim()) {
      errors.push({
        field: `costumes.${i}.stylistName`,
        message: "衣装担当を入力してください",
      });
    } else if (costume.stylistName.length > 100) {
      errors.push({
        field: `costumes.${i}.stylistName`,
        message: "衣装担当は100文字以内で入力してください",
      });
    }

    if (!costume.imagePath.trim()) {
      errors.push({
        field: `costumes.${i}.imagePath`,
        message: "衣装画像のStorage pathを入力してください",
      });
    } else if (!isTrackCostumeImagePath(costume.imagePath)) {
      errors.push({
        field: `costumes.${i}.imagePath`,
        message: "衣装画像はcostumes/配下のStorage object path形式で入力してください",
      });
    } else if (costume.imagePath.length > 500) {
      errors.push({
        field: `costumes.${i}.imagePath`,
        message: "衣装画像パスは500文字以内で入力してください",
      });
    }

    if (costume.note.length > 1000) {
      errors.push({
        field: `costumes.${i}.note`,
        message: "衣装メモは1000文字以内で入力してください",
      });
    }
  }

  return errors;
}
