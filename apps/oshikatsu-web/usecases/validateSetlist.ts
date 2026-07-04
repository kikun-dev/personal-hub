import type { SetlistEditorItemInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import { isSetlistItemType, isSetlistSection, isPerformanceStyle } from "@/types/live";

// #261: セットリスト編集ビューの入力を検証する純粋関数。
// rosterMemberIds は公演の出演メンバー（空なら範囲チェックしない）
export function validateSetlist(
  items: SetlistEditorItemInput[],
  rosterMemberIds: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rosterIds = new Set(rosterMemberIds);
  items.forEach((item, index) => {
    const field = `items.${index}`;
    if (!isSetlistItemType(item.itemType)) {
      errors.push({ field, message: "無効な項目種別です" });
      return;
    }
    if (!isSetlistSection(item.section)) {
      errors.push({ field, message: "無効なセクションです" });
    }
    if (item.itemType === "song" && !item.trackId && !item.songTitle.trim()) {
      errors.push({ field, message: "楽曲は登録曲の選択か曲名の入力が必要です" });
    }
    if (item.note.length > 500) {
      errors.push({ field, message: "メモは500文字以内で入力してください" });
    }
    if (item.costumeNote.length > 200) {
      errors.push({ field, message: "衣装は200文字以内で入力してください" });
    }
    if (item.itemType !== "song") return;
    for (const style of item.performanceStyles) {
      if (!isPerformanceStyle(style)) {
        errors.push({ field, message: "無効な披露タイプです" });
        break;
      }
    }
    const seen = new Set<string>();
    for (const member of item.members) {
      if (!member.memberId) continue;
      if (seen.has(member.memberId)) {
        errors.push({ field, message: "同じ披露メンバーが重複しています" });
        break;
      }
      if (rosterIds.size > 0 && !rosterIds.has(member.memberId)) {
        errors.push({ field, message: "披露メンバーは出演メンバーから選択してください" });
        break;
      }
      seen.add(member.memberId);
    }
  });
  return errors;
}
