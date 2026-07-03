"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import {
  parseMemberCount,
  type FormFormationRow,
  type ParticipantOption,
} from "@/components/admin/song/songFormShared";

// フォーメーション列内の1メンバー（dnd-kit で並べ替え可能なチップ）
function SortableMemberChip({
  id,
  index,
  name,
}: {
  id: string;
  index: number;
  name: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title="ドラッグで並べ替え"
      className="flex cursor-grab touch-none items-center gap-1 rounded-full border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs text-foreground active:cursor-grabbing"
    >
      <span aria-hidden className="text-foreground/30">
        ⠿
      </span>
      <span className="text-foreground/40">{index + 1}.</span>
      <span>{name}</span>
    </li>
  );
}

type SongFormationSectionProps = {
  formationRows: FormFormationRow[];
  centerMemberIds: string[];
  groupId: string;
  errors: Record<string, string>;
  participantOptionsCount: number;
  visibleParticipantOptions: ParticipantOption[];
  outOfGroupSelectedMemberNames: string[];
  participantNameById: Map<string, string>;
  showAllParticipantMembers: boolean;
  setShowAllParticipantMembers: Dispatch<SetStateAction<boolean>>;
  addFormationRow: () => void;
  removeFormationRow: (key: string) => void;
  updateFormationRowCount: (key: string, memberCount: string) => void;
  toggleFormationMember: (key: string, memberId: string) => void;
  toggleCenter: (memberId: string) => void;
  handleFormationDragEnd: (key: string) => (event: DragEndEvent) => void;
};

export function SongFormationSection({
  formationRows,
  centerMemberIds,
  groupId,
  errors,
  participantOptionsCount,
  visibleParticipantOptions,
  outOfGroupSelectedMemberNames,
  participantNameById,
  showAllParticipantMembers,
  setShowAllParticipantMembers,
  addFormationRow,
  removeFormationRow,
  updateFormationRowCount,
  toggleFormationMember,
  toggleCenter,
  handleFormationDragEnd,
}: SongFormationSectionProps) {
  // フォーメーション列内の並べ替え用センサー（ポインタ＋キーボード）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/70">フォーメーション</label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAllParticipantMembers((prev) => !prev)}
          >
            {showAllParticipantMembers ? "同グループのみ表示" : "他グループも表示"}
          </Button>
          <Button type="button" variant="ghost" onClick={addFormationRow}>
            + 列を追加
          </Button>
        </div>
      </div>
      {errors.formationRows && <p className="mb-2 text-xs text-red-500">{errors.formationRows}</p>}
      {participantOptionsCount === 0 && formationRows.length > 0 && (
        <p className="mb-2 text-xs text-foreground/50">リリースを選択すると参加メンバーを割り当てできます</p>
      )}
      {!showAllParticipantMembers && groupId && (
        <p className="mb-2 text-xs text-foreground/50">
          同グループ在籍歴のあるメンバーを優先表示中です
        </p>
      )}
      {outOfGroupSelectedMemberNames.length > 0 && (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          注意: 楽曲グループ外のメンバーが選択されています（
          {outOfGroupSelectedMemberNames.join(" / ")}）
        </p>
      )}
      <div className="space-y-3">
        {formationRows.map((row, index) => {
          const memberCount = parseMemberCount(row.memberCount);
          return (
            <div key={row._key} className="rounded-lg border border-foreground/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{index + 1}列目</p>
                <button
                  type="button"
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => removeFormationRow(row._key)}
                >
                  削除
                </button>
              </div>
              <Input
                id={`formation-member-count-${row._key}`}
                label="列人数"
                type="number"
                min={0}
                value={row.memberCount}
                onChange={(e) => updateFormationRowCount(row._key, e.target.value)}
                error={errors[`formationRows.${index}.memberCount`]}
              />

              <div className="mt-2">
                <p className="mb-1 text-xs text-foreground/60">
                  参加メンバー割当 ({row.memberIds.length}/{memberCount})
                </p>
                {errors[`formationRows.${index}.memberIds`] && (
                  <p className="mb-1 text-xs text-red-500">{errors[`formationRows.${index}.memberIds`]}</p>
                )}
                <div className="max-h-40 overflow-y-auto rounded border border-foreground/10 p-2">
                  {visibleParticipantOptions.map((option) => {
                    const checked = row.memberIds.includes(option.memberId);
                    const disabled = !checked && row.memberIds.length >= memberCount;

                    return (
                      <label
                        key={`${row._key}-${option.memberId}`}
                        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleFormationMember(row._key, option.memberId)}
                        />
                        <span>
                          {option.memberName}
                          {!option.isInSongGroup && (
                            <span className="ml-1 text-xs text-amber-600">(グループ外)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                  {visibleParticipantOptions.length === 0 && (
                    <p className="text-xs text-foreground/40">選択可能なメンバーがいません</p>
                  )}
                </div>
              </div>

              {row.memberIds.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-foreground/60">
                    並び順（ドラッグ/キーボードで左→右を調整）
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleFormationDragEnd(row._key)}
                  >
                    <SortableContext
                      items={row.memberIds}
                      strategy={rectSortingStrategy}
                    >
                      <ul className="flex flex-wrap gap-1.5">
                        {row.memberIds.map((memberId, slotIndex) => (
                          <SortableMemberChip
                            key={memberId}
                            id={memberId}
                            index={slotIndex}
                            name={participantNameById.get(memberId) ?? memberId}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {index === 0 && row.memberIds.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-foreground/60">
                    センター（1列目・最大2人）
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {row.memberIds.map((memberId) => {
                      const isCenter = centerMemberIds.includes(memberId);
                      const disabled =
                        !isCenter && centerMemberIds.length >= 2;
                      return (
                        <button
                          type="button"
                          key={memberId}
                          onClick={() => toggleCenter(memberId)}
                          disabled={disabled}
                          className={`rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            isCenter
                              ? "border-amber-400 bg-amber-100 text-amber-700"
                              : "border-foreground/10 bg-background text-foreground hover:bg-foreground/5"
                          }`}
                        >
                          {isCenter ? "★ " : ""}
                          {participantNameById.get(memberId) ?? memberId}
                        </button>
                      );
                    })}
                  </div>
                  {errors.centerMemberIds && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.centerMemberIds}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {formationRows.length === 0 && (
          <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
            フォーメーションは未設定です
          </p>
        )}
      </div>
    </div>
  );
}
