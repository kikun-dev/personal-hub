"use client";

import { useRef, useState } from "react";
import type { ValidationError } from "@/types/errors";
import type { SongOption } from "@/types/song";
import {
  PERFORMANCE_STYLE_LABELS,
  PERFORMANCE_STYLE_VALUES,
  SETLIST_ITEM_TYPE_LABELS,
  SETLIST_ITEM_TYPE_VALUES,
  SETLIST_SECTION_LABELS,
  SETLIST_SECTION_VALUES,
  type PerformanceStyle,
  type SetlistEditorItemInput,
  type SetlistEditorMemberInput,
  type SetlistItemType,
  type SetlistSection,
} from "@/types/live";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { PendingLink } from "@/components/ui/PendingLink";
import { TEXT_ACTION_CLASS } from "@/components/ui/TextLink";
import { addKeyedItem, moveKeyedItem, removeKeyedItem, updateKeyedItem } from "@/lib/keyedList";
import { toErrorMap } from "@/hooks/useAdminForm";
import { FormationRowsEditor } from "@/components/admin/formation/FormationRowsEditor";
import {
  isCenterAdditionBlocked,
  toggleCenterSelection,
} from "@/lib/centerSelection";
import {
  outOfCandidateAssignedMemberIds,
  removeMemberFromRows,
  toggleRowMember,
  unplacedMemberIds,
  updateRowMemberCount,
} from "@/lib/formationRows";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

type RosterMember = { memberId: string; memberNameJa: string };

type SetlistEditorProps = {
  live: { id: string; name: string };
  performanceId: string;
  performanceLabel: string;
  initialItems: SetlistEditorItemInput[];
  roster: RosterMember[];
  trackOptions: SongOption[];
  copySources: { id: string; label: string; items: SetlistEditorItemInput[] }[];
  onSubmit: (
    items: SetlistEditorItemInput[]
  ) => Promise<{ errors?: ValidationError[] }>;
  getTrackFormation: (
    trackId: string
  ) => Promise<{ rows: { memberIds: string[] }[] }>;
};

type FormationRowField = { key: number; memberCount: string; memberIds: string[] };

type SetlistItemField = {
  key: number;
  itemType: SetlistItemType;
  trackId: string;
  note: string;
  section: SetlistSection;
  performanceStyles: PerformanceStyle[];
  costumeNote: string;
  members: SetlistEditorMemberInput[];
  formationRows: FormationRowField[];
};

// 楽曲以外の項目種別選択肢（song は「楽曲を追加」ボタンで固定的に扱うため除く）
const NON_SONG_ITEM_TYPES = SETLIST_ITEM_TYPE_VALUES.filter(
  (type) => type !== "song"
);

const compactInputClass =
  "w-full rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/30";

export function SetlistEditor({
  live,
  performanceId,
  performanceLabel,
  initialItems,
  roster,
  trackOptions,
  copySources,
  onSubmit,
  getTrackFormation,
}: SetlistEditorProps) {
  const keyRef = useRef(0);
  const nextKey = () => {
    keyRef.current += 1;
    return keyRef.current;
  };

  const toItemField = (item: SetlistEditorItemInput): SetlistItemField => ({
    key: nextKey(),
    itemType: item.itemType,
    trackId: item.trackId,
    note: item.note,
    section: item.section,
    performanceStyles: item.performanceStyles,
    costumeNote: item.costumeNote,
    members: item.members.map((member) => ({ ...member })),
    formationRows: item.formationRows.map((row) => ({
      key: nextKey(),
      memberCount: row.memberCount,
      memberIds: [...row.memberIds],
    })),
  });

  const [items, setItems] = useState<SetlistItemField[]>(() =>
    initialItems.map((item) => toItemField(item))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyingFormationKeys, setCopyingFormationKeys] = useState<Set<number>>(
    new Set()
  );
  const [copySourceId, setCopySourceId] = useState("");

  const rosterIds = new Set(roster.map((member) => member.memberId));
  const rosterById = new Map(roster.map((member) => [member.memberId, member]));

  // 披露メンバー候補 = ロスター ∪ 選択済み extras（ロスター外でも解除できるよう表示）
  const memberCandidates = (item: SetlistItemField): RosterMember[] => {
    const extras = item.members
      .filter((member) => member.memberId && !rosterIds.has(member.memberId))
      .map((member) => ({
        memberId: member.memberId,
        memberNameJa: rosterById.get(member.memberId)?.memberNameJa ?? member.memberId,
      }));
    return [...roster, ...extras];
  };

  // 表示名は候補外（ロスター外・披露メンバー外）も解決できるようにする
  const nameById = (item: SetlistItemField): Map<string, string> => {
    const names = new Map(roster.map((member) => [member.memberId, member.memberNameJa]));
    for (const member of item.members) {
      if (!names.has(member.memberId)) {
        names.set(member.memberId, rosterById.get(member.memberId)?.memberNameJa ?? member.memberId);
      }
    }
    return names;
  };

  // フォーメーションへ割り当てられるのは披露メンバーだけ（#423 / ADR 0007 追記 §5）
  const formationCandidates = (item: SetlistItemField): RosterMember[] =>
    item.members.map((member) => ({
      memberId: member.memberId,
      memberNameJa: rosterById.get(member.memberId)?.memberNameJa ?? member.memberId,
    }));

  const addItem = (itemType: SetlistItemType) => {
    setItems((prev) =>
      addKeyedItem(prev, {
        key: nextKey(),
        itemType,
        trackId: "",
        note: "",
        section: "main",
        performanceStyles: [],
        costumeNote: "",
        members: [],
        formationRows: [],
      })
    );
  };

  const updateItem = (
    key: number,
    patch: Partial<SetlistItemField> | ((item: SetlistItemField) => SetlistItemField)
  ) => {
    setItems((prev) => updateKeyedItem(prev, (item) => item.key, key, patch));
  };

  const moveItem = (key: number, direction: -1 | 1) => {
    setItems((prev) => moveKeyedItem(prev, (item) => item.key, key, direction));
  };

  const removeItem = (key: number) => {
    setItems((prev) => removeKeyedItem(prev, (item) => item.key, key));
  };

  // 披露メンバーを外すときは、フォーメーションの配置も同じ state 更新で落とす。
  // 別々に処理すると、一瞬だけ「披露メンバー外が配置されている」状態が描画される。
  // センターは members から消えることで同時に失われる。
  const toggleMember = (itemKey: number, memberId: string) => {
    updateItem(itemKey, (item) => {
      const exists = item.members.some((member) => member.memberId === memberId);
      if (!exists) {
        return { ...item, members: [...item.members, { memberId, isCenter: false }] };
      }

      return {
        ...item,
        members: item.members.filter((member) => member.memberId !== memberId),
        formationRows: removeMemberFromRows(item.formationRows, memberId),
      };
    });
  };

  // センターは披露メンバー内の最大2人（ADR 0007 追記 §5）。上限到達後は追加せず、
  // 解除は常に許可する。保存境界の検証任せにせず、楽曲フォームと同じく
  // state 更新側で防いで操作前に制約を伝える。
  const toggleCenter = (itemKey: number, memberId: string) => {
    updateItem(itemKey, (item) => {
      const currentCenterIds = item.members
        .filter((member) => member.isCenter)
        .map((member) => member.memberId);
      const nextCenterIds = new Set(toggleCenterSelection(currentCenterIds, memberId));

      return {
        ...item,
        members: item.members.map((member) => ({
          ...member,
          isCenter: nextCenterIds.has(member.memberId),
        })),
      };
    });
  };

  // 「全員」ボタン：roster全員をmembersにセット（既存isCenterは保持、roster外の既存選択は残す）
  const setAllMembers = (itemKey: number) => {
    updateItem(itemKey, (item) => {
      const existingById = new Map(item.members.map((member) => [member.memberId, member]));
      const rosterMembers: SetlistEditorMemberInput[] = roster.map((member) => ({
        memberId: member.memberId,
        isCenter: existingById.get(member.memberId)?.isCenter ?? false,
      }));
      const extras = item.members.filter((member) => !rosterIds.has(member.memberId));
      return { ...item, members: [...rosterMembers, ...extras] };
    });
  };

  const togglePerformanceStyle = (itemKey: number, style: PerformanceStyle) => {
    updateItem(itemKey, (item) => ({
      ...item,
      performanceStyles: item.performanceStyles.includes(style)
        ? item.performanceStyles.filter((s) => s !== style)
        : [...item.performanceStyles, style],
    }));
  };

  const addFormationRow = (itemKey: number) => {
    updateItem(itemKey, (item) => ({
      ...item,
      formationRows: addKeyedItem(item.formationRows, {
        key: nextKey(),
        memberCount: "0",
        memberIds: [],
      }),
    }));
  };

  const removeFormationRow = (itemKey: number, rowKey: number) => {
    updateItem(itemKey, (item) => ({
      ...item,
      formationRows: removeKeyedItem(item.formationRows, (row) => row.key, rowKey),
    }));
  };

  const updateFormationRowCount = (
    itemKey: number,
    rowKey: number,
    memberCount: string
  ) => {
    updateItem(itemKey, (item) => ({
      ...item,
      formationRows: updateKeyedItem(item.formationRows, (row) => row.key, rowKey, (row) =>
        updateRowMemberCount(row, memberCount)
      ),
    }));
  };

  const toggleFormationMember = (itemKey: number, rowKey: number, memberId: string) => {
    updateItem(itemKey, (item) => ({
      ...item,
      formationRows: updateKeyedItem(item.formationRows, (row) => row.key, rowKey, (row) =>
        toggleRowMember(row, memberId)
      ),
    }));
  };

  // 列内の並び順（= slot_order = 左→右）をドラッグ&ドロップ／キーボードで入れ替える
  const handleFormationDragEnd =
    (itemKey: number, rowKey: number) =>
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      updateItem(itemKey, (item) => ({
        ...item,
        formationRows: updateKeyedItem(item.formationRows, (row) => row.key, rowKey, (row) => {
          const from = row.memberIds.indexOf(String(active.id));
          const to = row.memberIds.indexOf(String(over.id));
          if (from < 0 || to < 0) return row;
          return { ...row, memberIds: arrayMove(row.memberIds, from, to) };
        }),
      }));
    };

  const copyFormationFromTrack = async (itemKey: number, trackId: string) => {
    if (!trackId) return;
    const target = items.find((item) => item.key === itemKey);
    if (target && target.formationRows.some((row) => row.memberIds.length > 0)) {
      const confirmed = window.confirm(
        "既存のフォーメーションを楽曲マスタの内容で上書きします。よろしいですか？"
      );
      if (!confirmed) return;
    }
    setCopyingFormationKeys((prev) => new Set(prev).add(itemKey));
    try {
      const result = await getTrackFormation(trackId);
      // 楽曲マスタにはこの公演のロスター外メンバー（卒業生等）が含まれ得るため、
      // ロスター内のみに絞って取り込む（保存時の境界検証と整合させる）。
      // ロスターが空（未設定）の場合は絞り込めないためそのまま取り込む。
      const filterToRoster = rosterIds.size > 0;
      const copiedRows = result.rows
        .map((row) => {
          const memberIds = filterToRoster
            ? row.memberIds.filter((id) => rosterIds.has(id))
            : row.memberIds;
          return {
            key: nextKey(),
            memberCount: String(memberIds.length),
            memberIds,
          };
        })
        .filter((row) => row.memberIds.length > 0);

      // 配置は披露メンバーの部分集合という不変条件を保つため、コピーした
      // メンバーを披露メンバーへも取り込む（既存のセンター指定は維持する）。
      // 卒業・休演を理由にした除外と、その通知は #424 の範囲。
      updateItem(itemKey, (item) => {
        const existingIds = new Set(item.members.map((member) => member.memberId));
        const added = copiedRows
          .flatMap((row) => row.memberIds)
          .filter((memberId) => !existingIds.has(memberId));

        return {
          ...item,
          members: [
            ...item.members,
            ...Array.from(new Set(added)).map((memberId) => ({
              memberId,
              isCenter: false,
            })),
          ],
          formationRows: copiedRows,
        };
      });
    } finally {
      setCopyingFormationKeys((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const copyCostumeFromPrevious = (index: number) => {
    if (index <= 0) return;
    const previous = items[index - 1];
    const current = items[index];
    updateItem(current.key, { costumeNote: previous.costumeNote });
  };

  const handleCopyFromPerformance = (sourceId: string) => {
    const source = copySources.find((s) => s.id === sourceId);
    if (!source) {
      setCopySourceId("");
      return;
    }
    if (items.length > 0) {
      const confirmed = window.confirm(
        "現在のセットリストを上書きしてコピーします。よろしいですか？"
      );
      if (!confirmed) {
        setCopySourceId("");
        return;
      }
    }
    setItems(source.items.map((item) => toItemField(item)));
    setCopySourceId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const payload: SetlistEditorItemInput[] = items.map((item) => ({
      itemType: item.itemType,
      trackId: item.trackId,
      note: item.note,
      section: item.section,
      performanceStyles: item.performanceStyles,
      costumeNote: item.costumeNote,
      members: item.members,
      formationRows: item.formationRows.map((row) => ({
        memberCount: row.memberCount,
        memberIds: row.memberIds,
      })),
    }));

    try {
      const result = await onSubmit(payload);
      if (result.errors) {
        setErrors(toErrorMap(result.errors));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <PendingLink
          href={`/lives/${live.id}/performances/${performanceId}/setlist`}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← セットリスト（参照）
        </PendingLink>
        <h1 className="text-lg font-bold text-foreground">セットリストを編集</h1>
        <p className="text-sm text-foreground/70">{performanceLabel}</p>
      </div>

      <FormErrorBanner message={errors._form} />

      {copySources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-foreground/70">別公演からコピー</label>
          <select
            value={copySourceId}
            onChange={(e) => handleCopyFromPerformance(e.target.value)}
            className="rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="">選択してください</option>
            {copySources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground/70">項目</label>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => addItem("song")}>
            楽曲を追加
          </Button>
          <Button type="button" variant="secondary" onClick={() => addItem("mc")}>
            楽曲以外を追加
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.key}
            className="space-y-2 rounded-lg border border-foreground/10 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-foreground/50">{index + 1}</span>
              {item.itemType === "song" ? (
                <span className="rounded bg-foreground/10 px-2 py-1 text-xs text-foreground/70">
                  楽曲
                </span>
              ) : (
                <select
                  value={item.itemType}
                  onChange={(e) =>
                    updateItem(item.key, { itemType: e.target.value as SetlistItemType })
                  }
                  className="rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground"
                >
                  {NON_SONG_ITEM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SETLIST_ITEM_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={item.section}
                onChange={(e) =>
                  updateItem(item.key, { section: e.target.value as SetlistSection })
                }
                aria-label="セクション"
                className="rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground"
              >
                {SETLIST_SECTION_VALUES.map((section) => (
                  <option key={section} value={section}>
                    {SETLIST_SECTION_LABELS[section]}
                  </option>
                ))}
              </select>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(item.key, -1)}
                  className="px-1 text-xs text-foreground/60 hover:text-foreground"
                  aria-label="上へ"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(item.key, 1)}
                  className="px-1 text-xs text-foreground/60 hover:text-foreground"
                  aria-label="下へ"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="px-1 text-xs text-red-500 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>

            {item.itemType === "song" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Combobox
                    value={item.trackId}
                    onChange={(trackId) => updateItem(item.key, { trackId })}
                    options={trackOptions.map((track) => ({
                      value: track.id,
                      label: track.title,
                    }))}
                    ariaLabel="登録曲を検索"
                    placeholder="登録曲を検索"
                    emptyLabel="未選択"
                    className="w-44"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {PERFORMANCE_STYLE_VALUES.map((style) => (
                    <label
                      key={style}
                      className="flex cursor-pointer items-center gap-1 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={item.performanceStyles.includes(style)}
                        onChange={() => togglePerformanceStyle(item.key, style)}
                      />
                      <span className="text-foreground">
                        {PERFORMANCE_STYLE_LABELS[style]}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="rounded-lg border border-foreground/10 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs text-foreground/50">
                      披露メンバー（C=センター）
                    </p>
                    <button
                      type="button"
                      onClick={() => setAllMembers(item.key)}
                      className={`text-xs ${TEXT_ACTION_CLASS}`}
                    >
                      全員
                    </button>
                  </div>
                  <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
                    {memberCandidates(item).map((candidate) => {
                      const selected = item.members.find(
                        (member) => member.memberId === candidate.memberId
                      );
                      return (
                        <div
                          key={candidate.memberId}
                          className="flex items-center gap-1 text-xs"
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={Boolean(selected)}
                              onChange={() => toggleMember(item.key, candidate.memberId)}
                            />
                            <span className="text-foreground">
                              {candidate.memberNameJa}
                            </span>
                          </label>
                          {selected && (
                            <button
                              type="button"
                              onClick={() => toggleCenter(item.key, candidate.memberId)}
                              disabled={isCenterAdditionBlocked(
                                item.members
                                  .filter((member) => member.isCenter)
                                  .map((member) => member.memberId),
                                candidate.memberId
                              )}
                              aria-pressed={selected.isCenter}
                              className={`rounded px-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                                selected.isCenter
                                  ? "bg-pink-500 text-white"
                                  : "bg-foreground/10 text-foreground/50"
                              }`}
                              aria-label="センター切り替え"
                            >
                              C
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-foreground/10 p-2">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => copyFormationFromTrack(item.key, item.trackId)}
                      disabled={!item.trackId || copyingFormationKeys.has(item.key)}
                      className={`text-xs ${TEXT_ACTION_CLASS} disabled:cursor-not-allowed disabled:text-foreground/30`}
                    >
                      楽曲マスタからコピー
                    </button>
                  </div>
                  {(() => {
                    const candidates = formationCandidates(item);
                    const candidateIds = candidates.map((candidate) => candidate.memberId);
                    const names = nameById(item);
                    return (
                      <FormationRowsEditor
                        label="フォーメーション"
                        rows={item.formationRows.map((row) => ({
                          key: String(row.key),
                          memberCount: row.memberCount,
                          memberIds: row.memberIds,
                        }))}
                        candidates={candidates.map((candidate) => ({
                          memberId: candidate.memberId,
                          memberName: candidate.memberNameJa,
                        }))}
                        nameById={names}
                        unplacedMemberNames={unplacedMemberIds(
                          item.formationRows,
                          candidateIds
                        ).map((memberId) => names.get(memberId) ?? memberId)}
                        outOfCandidateMemberIds={outOfCandidateAssignedMemberIds(
                          item.formationRows,
                          candidateIds
                        )}
                        errors={errors}
                        errorPrefix={`items.${index}.formationRows`}
                        addRow={() => addFormationRow(item.key)}
                        removeRow={(rowKey) =>
                          removeFormationRow(item.key, Number(rowKey))
                        }
                        updateRowMemberCount={(rowKey, memberCount) =>
                          updateFormationRowCount(item.key, Number(rowKey), memberCount)
                        }
                        toggleRowMember={(rowKey, memberId) =>
                          toggleFormationMember(item.key, Number(rowKey), memberId)
                        }
                        handleDragEnd={(rowKey) =>
                          handleFormationDragEnd(item.key, Number(rowKey))
                        }
                      />
                    );
                  })()}
                </div>
              </>
            ) : null}

            <div className="flex items-center gap-2">
              <input
                value={item.costumeNote}
                onChange={(e) => updateItem(item.key, { costumeNote: e.target.value })}
                placeholder="衣装（任意）"
                className={compactInputClass}
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => copyCostumeFromPrevious(index)}
                  className={`shrink-0 text-xs ${TEXT_ACTION_CLASS}`}
                >
                  上と同じ
                </button>
              )}
            </div>

            <input
              value={item.note}
              onChange={(e) => updateItem(item.key, { note: e.target.value })}
              placeholder={item.itemType === "song" ? "メモ（任意）" : "内容・メモ"}
              className={compactInputClass}
            />

            {errors[`items.${index}`] && (
              <p className="text-xs text-red-500">{errors[`items.${index}`]}</p>
            )}
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : "保存する"}
      </Button>
    </form>
  );
}
