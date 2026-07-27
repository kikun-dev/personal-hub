"use client";

import { useMemo } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  FormationRowsEditor,
  type FormationCandidate,
} from "@/components/admin/formation/FormationRowsEditor";
import { outOfCandidateAssignedMemberIds } from "@/lib/formationRows";
import type { FormFormationRow } from "@/components/admin/song/songFormShared";

type SongFormationSectionProps = {
  formationRows: FormFormationRow[];
  errors: Record<string, string>;
  // 割当候補は楽曲参加メンバーに限る（#427）。参加メンバー選択は前段のセクションで行う。
  assignableMembers: FormationCandidate[];
  unplacedMemberNames: string[];
  participantNameById: Map<string, string>;
  addFormationRow: () => void;
  removeFormationRow: (key: string) => void;
  updateFormationRowCount: (key: string, memberCount: string) => void;
  toggleFormationMember: (key: string, memberId: string) => void;
  handleFormationDragEnd: (key: string) => (event: DragEndEvent) => void;
};

/**
 * 楽曲フォームのフォーメーション欄。
 * 列カードの描画と操作は `FormationRowsEditor`（セットリストと共通）に委ね、
 * ここは楽曲側の state 形状（`_key`）との接続だけを担う（#423）。
 */
export function SongFormationSection({
  formationRows,
  errors,
  assignableMembers,
  unplacedMemberNames,
  participantNameById,
  addFormationRow,
  removeFormationRow,
  updateFormationRowCount,
  toggleFormationMember,
  handleFormationDragEnd,
}: SongFormationSectionProps) {
  const rows = useMemo(
    () =>
      formationRows.map((row) => ({
        key: row._key,
        memberCount: row.memberCount,
        memberIds: row.memberIds,
      })),
    [formationRows]
  );

  // 参加メンバーを外すと配置も同時に落ちるため通常は空だが、
  // 想定外の状態でも解除できるよう共通部品へ渡す。
  const outOfCandidateMemberIds = useMemo(
    () =>
      outOfCandidateAssignedMemberIds(
        rows,
        assignableMembers.map((member) => member.memberId)
      ),
    [assignableMembers, rows]
  );

  return (
    <FormationRowsEditor
      label="フォーメーション"
      rows={rows}
      candidates={assignableMembers}
      nameById={participantNameById}
      unplacedMemberNames={unplacedMemberNames}
      outOfCandidateMemberIds={outOfCandidateMemberIds}
      errors={errors}
      errorPrefix="formationRows"
      addRow={addFormationRow}
      removeRow={removeFormationRow}
      updateRowMemberCount={updateFormationRowCount}
      toggleRowMember={toggleFormationMember}
      handleDragEnd={handleFormationDragEnd}
    />
  );
}
