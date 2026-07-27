"use client";

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
      className="flex cursor-grab touch-none items-center gap-1 rounded-full border border-border-subtle bg-surface-subtle px-2.5 py-1 text-xs text-foreground active:cursor-grabbing"
    >
      <span aria-hidden className="text-foreground-secondary">
        ⠿
      </span>
      <span className="text-foreground-secondary">{index + 1}.</span>
      <span>{name}</span>
    </li>
  );
}

type SongFormationSectionProps = {
  formationRows: FormFormationRow[];
  errors: Record<string, string>;
  // 割当候補は楽曲参加メンバーに限る（#427）。参加メンバー選択は前段のセクションで行う。
  assignableMembers: Array<{ memberId: string; memberName: string }>;
  unplacedMemberNames: string[];
  participantNameById: Map<string, string>;
  addFormationRow: () => void;
  removeFormationRow: (key: string) => void;
  updateFormationRowCount: (key: string, memberCount: string) => void;
  toggleFormationMember: (key: string, memberId: string) => void;
  handleFormationDragEnd: (key: string) => (event: DragEndEvent) => void;
};

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
  // フォーメーション列内の並べ替え用センサー（ポインタ＋キーボード）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground-secondary">
          フォーメーション
        </label>
        <Button
          type="button"
          variant="ghost"
          onClick={addFormationRow}
          disabled={assignableMembers.length === 0}
        >
          + 列を追加
        </Button>
      </div>

      {errors.formationRows && (
        <p className="mb-2 text-xs text-danger-text">{errors.formationRows}</p>
      )}

      {/* フォーメーションを登録する場合は参加メンバー全員の配置が必要。
          次に必要な操作が分かるよう、未配置を列の近くに一覧表示する（#427） */}
      {formationRows.length > 0 && unplacedMemberNames.length > 0 && (
        <p className="mb-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground">
          未配置 {unplacedMemberNames.length}人: {unplacedMemberNames.join(" / ")}
        </p>
      )}

      <div className="space-y-3">
        {formationRows.map((row, index) => {
          const memberCount = parseMemberCount(row.memberCount);
          return (
            <div key={row._key} className="rounded-lg border border-border-subtle p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{index + 1}列目</p>
                <button
                  type="button"
                  className="rounded text-xs text-danger-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
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
                <p className="mb-1 text-xs text-foreground-secondary">
                  メンバー割当 ({row.memberIds.length}/{memberCount})
                </p>
                {errors[`formationRows.${index}.memberIds`] && (
                  <p className="mb-1 text-xs text-danger-text">
                    {errors[`formationRows.${index}.memberIds`]}
                  </p>
                )}
                <div className="max-h-40 overflow-y-auto rounded border border-border-subtle p-2">
                  {assignableMembers.map((member) => {
                    const checked = row.memberIds.includes(member.memberId);
                    const disabled = !checked && row.memberIds.length >= memberCount;

                    return (
                      <label
                        key={`${row._key}-${member.memberId}`}
                        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-subtle"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() =>
                            toggleFormationMember(row._key, member.memberId)
                          }
                        />
                        <span>{member.memberName}</span>
                      </label>
                    );
                  })}
                  {assignableMembers.length === 0 && (
                    <p className="text-xs text-foreground-secondary">—</p>
                  )}
                </div>
              </div>

              {row.memberIds.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-foreground-secondary">並び順</p>
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
            </div>
          );
        })}

        {formationRows.length === 0 && (
          <p className="rounded-lg border border-dashed border-border-subtle py-4 text-center text-xs text-foreground-secondary">
            フォーメーション未設定
          </p>
        )}
      </div>
    </div>
  );
}
