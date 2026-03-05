import type { CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { SONG_POSITIONS } from "@/lib/constants";
import { isValidDateString } from "@/lib/validation";

function isSongPosition(value: string): boolean {
  return (SONG_POSITIONS as readonly string[]).includes(value);
}

export function validateSong(input: CreateSongInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.title.trim()) {
    errors.push({ field: "title", message: "タイトルを入力してください" });
  } else if (input.title.length > 200) {
    errors.push({ field: "title", message: "タイトルは200文字以内で入力してください" });
  }

  if (input.lyricsBy && input.lyricsBy.length > 100) {
    errors.push({ field: "lyricsBy", message: "作詞者は100文字以内で入力してください" });
  }

  if (input.musicBy && input.musicBy.length > 100) {
    errors.push({ field: "musicBy", message: "作曲者は100文字以内で入力してください" });
  }

  if (input.releaseDate && !isValidDateString(input.releaseDate)) {
    errors.push({ field: "releaseDate", message: "リリース日はYYYY-MM-DD形式で入力してください" });
  }

  if (input.groupIds.length === 0) {
    errors.push({ field: "groupIds", message: "1つ以上のグループを選択してください" });
  }

  for (let i = 0; i < input.members.length; i++) {
    const m = input.members[i];
    if (!m.memberId) {
      errors.push({ field: `members.${i}.memberId`, message: "メンバーを選択してください" });
    }
    if (!m.position) {
      errors.push({ field: `members.${i}.position`, message: "ポジションを選択してください" });
    } else if (!isSongPosition(m.position)) {
      errors.push({ field: `members.${i}.position`, message: "無効なポジションです" });
    }

    const positionOrder = Number(m.positionOrder);
    if (!Number.isInteger(positionOrder) || positionOrder < 0) {
      errors.push({
        field: `members.${i}.positionOrder`,
        message: "表示順は0以上の整数で入力してください",
      });
    }
  }

  // 重複メンバーチェック
  const memberIds = input.members.map((m) => m.memberId).filter(Boolean);
  const seen = new Set<string>();
  for (const id of memberIds) {
    if (seen.has(id)) {
      errors.push({ field: "members", message: "同じメンバーが複数回選択されています" });
      break;
    }
    seen.add(id);
  }

  return errors;
}
