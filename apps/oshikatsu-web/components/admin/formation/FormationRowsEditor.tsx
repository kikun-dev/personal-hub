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
import { parseMemberCount, type FormationRowLike } from "@/lib/formationRows";

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

export type FormationEditorRow = FormationRowLike & { key: string };

export type FormationCandidate = { memberId: string; memberName: string };

type FormationRowsEditorProps = {
  label: string;
  rows: FormationEditorRow[];
  // 割当候補。楽曲登録は楽曲参加メンバー、セットリストは披露メンバーを渡す。
  candidates: FormationCandidate[];
  // 候補外も含む表示名の解決。コピーや既存データ由来の配置を名前で出すために使う。
  nameById: ReadonlyMap<string, string>;
  unplacedMemberNames: string[];
  // 候補外なのに配置されているメンバー。列カード内で解除できるよう行として出す。
  outOfCandidateMemberIds: string[];
  errors: Record<string, string>;
  // errors のキー接頭辞。楽曲は "formationRows"、セットリストは item ごとに変わる。
  errorPrefix: string;
  addRow: () => void;
  removeRow: (key: string) => void;
  updateRowMemberCount: (key: string, memberCount: string) => void;
  toggleRowMember: (key: string, memberId: string) => void;
  handleDragEnd: (key: string) => (event: DragEndEvent) => void;
};

/**
 * フォーメーション列の共通編集UI（#423）。
 *
 * 楽曲登録とセットリストで操作モデルを揃えるため、列カード（列人数・割当・
 * 並び順・未配置・候補外）の描画と操作をここへ集約する。候補の供給源と
 * state の持ち方は呼び出し側の責務で、この部品は表示と通知だけを担う。
 */
export function FormationRowsEditor({
  label,
  rows,
  candidates,
  nameById,
  unplacedMemberNames,
  outOfCandidateMemberIds,
  errors,
  errorPrefix,
  addRow,
  removeRow,
  updateRowMemberCount,
  toggleRowMember,
  handleDragEnd,
}: FormationRowsEditorProps) {
  // 並べ替え用センサー（ポインタ＋キーボード）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const outOfCandidateSet = new Set(outOfCandidateMemberIds);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground-secondary">{label}</label>
        <Button
          type="button"
          variant="ghost"
          onClick={addRow}
          disabled={candidates.length === 0}
        >
          + 列を追加
        </Button>
      </div>

      {errors[errorPrefix] && (
        <p className="mb-2 text-xs text-danger-text">{errors[errorPrefix]}</p>
      )}

      {/* フォーメーションを登録する場合は候補メンバー全員の配置が必要。
          次に必要な操作が分かるよう、未配置を列の近くへ出す */}
      {rows.length > 0 && unplacedMemberNames.length > 0 && (
        <p className="mb-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground">
          未配置 {unplacedMemberNames.length}人: {unplacedMemberNames.join(" / ")}
        </p>
      )}

      {/* コピーや既存データで候補外が配置されていることがある。
          そのままでは保存できないため、件数を示して解除を促す */}
      {outOfCandidateMemberIds.length > 0 && (
        <p className="mb-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground">
          候補外の配置 {outOfCandidateMemberIds.length}人:{" "}
          {outOfCandidateMemberIds
            .map((memberId) => nameById.get(memberId) ?? memberId)
            .join(" / ")}
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, index) => {
          const memberCount = parseMemberCount(row.memberCount);
          // 候補外の配置はこの列の分だけ、候補の後ろへ並べて解除できるようにする
          const outOfCandidateInRow = row.memberIds.filter((memberId) =>
            outOfCandidateSet.has(memberId)
          );

          return (
            <div key={row.key} className="rounded-lg border border-border-subtle p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{index + 1}列目</p>
                <button
                  type="button"
                  className="rounded text-xs text-danger-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  onClick={() => removeRow(row.key)}
                >
                  削除
                </button>
              </div>
              <Input
                id={`formation-member-count-${row.key}`}
                label="列人数"
                type="number"
                min={0}
                value={row.memberCount}
                onChange={(e) => updateRowMemberCount(row.key, e.target.value)}
                error={errors[`${errorPrefix}.${index}.memberCount`]}
              />

              <div className="mt-2">
                <p className="mb-1 text-xs text-foreground-secondary">
                  メンバー割当 ({row.memberIds.length}/{memberCount})
                </p>
                {errors[`${errorPrefix}.${index}.memberIds`] && (
                  <p className="mb-1 text-xs text-danger-text">
                    {errors[`${errorPrefix}.${index}.memberIds`]}
                  </p>
                )}
                <div className="max-h-40 overflow-y-auto rounded border border-border-subtle p-2">
                  {candidates.map((candidate) => {
                    const checked = row.memberIds.includes(candidate.memberId);
                    const disabled = !checked && row.memberIds.length >= memberCount;

                    return (
                      <label
                        key={`${row.key}-${candidate.memberId}`}
                        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-subtle"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleRowMember(row.key, candidate.memberId)}
                        />
                        <span>{candidate.memberName}</span>
                      </label>
                    );
                  })}
                  {outOfCandidateInRow.map((memberId) => (
                    <label
                      key={`${row.key}-out-${memberId}`}
                      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-subtle"
                    >
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleRowMember(row.key, memberId)}
                      />
                      <span>
                        {nameById.get(memberId) ?? memberId}
                        <span className="ml-1 text-xs text-danger-text">（候補外）</span>
                      </span>
                    </label>
                  ))}
                  {candidates.length === 0 && outOfCandidateInRow.length === 0 && (
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
                    onDragEnd={handleDragEnd(row.key)}
                  >
                    <SortableContext items={row.memberIds} strategy={rectSortingStrategy}>
                      <ul className="flex flex-wrap gap-1.5">
                        {row.memberIds.map((memberId, slotIndex) => (
                          <SortableMemberChip
                            key={memberId}
                            id={memberId}
                            index={slotIndex}
                            name={nameById.get(memberId) ?? memberId}
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

        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-border-subtle py-4 text-center text-xs text-foreground-secondary">
            フォーメーション未設定
          </p>
        )}
      </div>
    </div>
  );
}
