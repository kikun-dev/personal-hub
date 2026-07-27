import type { SetlistEditorItemInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import { isSetlistItemType, isSetlistSection, isPerformanceStyle } from "@/types/live";
import { isValidUuid } from "@/lib/validation";

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
    // trackId は truthy だけでなく UUID 形式まで検証する。action 直呼びで空白や
    // 非 UUID 文字列が渡ると RPC 内の UUID キャストで汎用エラーになるため、
    // ここで項目単位の行動可能なエラーとして弾く（#422 レビュー P2）。
    if (item.itemType === "song" && !isValidUuid(item.trackId)) {
      errors.push({ field, message: "楽曲は登録曲の選択が必要です" });
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

    // フォーメーションのメンバーも披露メンバーと同じ境界で検証する。
    // 楽曲マスタからのコピーや action 直呼びでロスター外・重複が混入しても
    // ここで弾く（DB の UNIQUE 制約に頼らず汎用エラーを避ける）。
    // 同一メンバーは楽曲内で1箇所のみ（複数行にまたがる重複も不正）。
    const seenFormationMembers = new Set<string>();
    let formationInvalid = false;
    for (const row of item.formationRows) {
      if (formationInvalid) break;
      for (const memberId of row.memberIds) {
        if (!memberId) {
          errors.push({ field, message: "フォーメーションのメンバー指定が不正です" });
          formationInvalid = true;
          break;
        }
        if (seenFormationMembers.has(memberId)) {
          errors.push({ field, message: "フォーメーションで同じメンバーが重複しています" });
          formationInvalid = true;
          break;
        }
        if (rosterIds.size > 0 && !rosterIds.has(memberId)) {
          errors.push({
            field,
            message: "フォーメーションのメンバーは出演メンバーから選択してください",
          });
          formationInvalid = true;
          break;
        }
        seenFormationMembers.add(memberId);
      }
    }
    if (formationInvalid) return;

    // #423 / ADR 0007 追記 §5: 披露メンバーとフォーメーション・センターの整合。
    // 列人数はUI状態に閉じず入力として受け取り、ここで割当人数との一致を検証する。
    const performerIds = new Set(
      item.members.map((member) => member.memberId).filter(Boolean)
    );

    item.formationRows.forEach((row, rowIndex) => {
      const memberCount = Number(row.memberCount);
      if (!Number.isInteger(memberCount) || memberCount < 0) {
        errors.push({
          field: `${field}.formationRows.${rowIndex}.memberCount`,
          message: "列人数は0以上の整数で入力してください",
        });
        return;
      }
      if (row.memberIds.length !== memberCount) {
        errors.push({
          field: `${field}.formationRows.${rowIndex}.memberIds`,
          message: "列人数と割当メンバー数を一致させてください",
        });
      }
    });

    if (item.formationRows.length > 0) {
      // フォーメーションを登録する場合、配置と披露メンバーを完全一致させる。
      // 部分集合を許すと「未配置」と「入力漏れ」を区別できない。
      const unplacedCount = Array.from(performerIds).filter(
        (memberId) => !seenFormationMembers.has(memberId)
      ).length;
      if (unplacedCount > 0) {
        errors.push({
          field: `${field}.formationRows`,
          message: `披露メンバー${unplacedCount}人がフォーメーションに配置されていません`,
        });
      }

      const outOfPerformerCount = Array.from(seenFormationMembers).filter(
        (memberId) => !performerIds.has(memberId)
      ).length;
      if (outOfPerformerCount > 0) {
        errors.push({
          field: `${field}.formationRows`,
          message: "フォーメーションには披露メンバーだけを配置してください",
        });
      }
    }

    // センターは披露メンバー内の最大2人。フォーメーションがある場合のみ1列目必須。
    const centerIds = item.members
      .filter((member) => member.isCenter && member.memberId)
      .map((member) => member.memberId);
    if (centerIds.length > 2) {
      errors.push({ field, message: "センターは最大2人まで指定できます" });
    }
    if (item.formationRows.length > 0 && centerIds.length > 0) {
      const frontRowIds = new Set(item.formationRows[0]?.memberIds ?? []);
      if (centerIds.some((memberId) => !frontRowIds.has(memberId))) {
        errors.push({
          field,
          message: "センターは1列目のメンバーから選んでください",
        });
      }
    }
  });
  return errors;
}
