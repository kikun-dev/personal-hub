import type {
  CreateSongInput,
  SongCreditRole,
} from "@/types/song";
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

  if (input.durationSeconds) {
    const seconds = Number(input.durationSeconds);
    if (!Number.isInteger(seconds) || seconds <= 0) {
      errors.push({
        field: "durationSeconds",
        message: "時間は1以上の整数（秒）で入力してください",
      });
    }
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

    const trackNumber = Number(link.trackNumber);
    if (!Number.isInteger(trackNumber) || trackNumber <= 0) {
      errors.push({
        field: `releaseLinks.${i}.trackNumber`,
        message: "曲順は1以上の整数で入力してください",
      });
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
