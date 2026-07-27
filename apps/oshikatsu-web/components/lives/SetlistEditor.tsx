"use client";

import { useReducer, useRef, useState } from "react";
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
import { addKeyedItem, moveKeyedItem, removeKeyedItem, updateKeyedItem } from "@/lib/keyedList";
import { toErrorMap } from "@/hooks/useAdminForm";
import type { OriginalMembersActionResult } from "@/app/(authenticated)/lives/[id]/performances/[performanceId]/setlist/edit/actions";
import {
  getOperationOutcome,
  hasPendingOperation,
  initialOriginalMemberOperationState,
  isCurrentRequest,
  isItemPending,
  originalMemberOperationReducer,
  type OriginalMemberOperationEvent,
} from "@/usecases/originalMemberOperation";
import { OriginalMembersNotice } from "@/components/lives/OriginalMembersNotice";
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
  resolveOriginalMembers: (
    trackId: string,
    liveId: string,
    performanceId: string
  ) => Promise<OriginalMembersActionResult>;
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
  resolveOriginalMembers,
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
  // オリメン反映の処理中表示・通知・リクエスト識別を、1つの操作状態から導出する。
  // 別々の state で持つと、楽曲変更・項目削除・別公演コピー・連打のたびに
  // 手作業で整合を取る必要があり、実際にそこから不具合が出た（#424）。
  const [originalMemberOps, setOriginalMemberOps] = useReducer(
    originalMemberOperationReducer,
    initialOriginalMemberOperationState
  );
  const originalMemberRequestIdRef = useRef(0);
  // 非同期ハンドラはクロージャの state を見るため、応答時点の最新状態を判定できない。
  // reducer は純粋なので、同じ event で同期的に進めた ref をミラーとして持つ。
  const originalMemberOpsRef = useRef(initialOriginalMemberOperationState);
  const dispatchOriginalMemberOp = (event: OriginalMemberOperationEvent) => {
    originalMemberOpsRef.current = originalMemberOperationReducer(
      originalMemberOpsRef.current,
      event
    );
    setOriginalMemberOps(event);
  };
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

  // 楽曲を変更したら、実行中のオリメン反映を無効化し、旧楽曲の通知も落とす。
  // ref の更新は同期的なので、応答が返る前に確実に無効化できる。
  const changeTrackId = (itemKey: number, trackId: string) => {
    dispatchOriginalMemberOp({ type: "trackChanged", itemKey });
    updateItem(itemKey, { trackId });
  };

  const moveItem = (key: number, direction: -1 | 1) => {
    setItems((prev) => moveKeyedItem(prev, (item) => item.key, key, direction));
  };

  const removeItem = (key: number) => {
    dispatchOriginalMemberOp({ type: "itemRemoved", itemKey: key });
    setItems((prev) => removeKeyedItem(prev, (item) => item.key, key));
  };

  // 披露メンバーを外すときは、フォーメーションの配置も同じ state 更新で落とす。
  // 別々に処理すると、一瞬だけ「披露メンバー外が配置されている」状態が描画される。
  // センターは members から消えることで同時に失われる。
  const toggleMember = (itemKey: number, memberId: string) => {
    dispatchOriginalMemberOp({ type: "inputChanged", itemKey });
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
    dispatchOriginalMemberOp({ type: "inputChanged", itemKey });
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
    dispatchOriginalMemberOp({ type: "inputChanged", itemKey });
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
    dispatchOriginalMemberOp({ type: "inputChanged", itemKey });
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
    dispatchOriginalMemberOp({ type: "inputChanged", itemKey });
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
    dispatchOriginalMemberOp({ type: "inputChanged", itemKey });
    updateItem(itemKey, (item) => ({
      ...item,
      formationRows: updateKeyedItem(item.formationRows, (row) => row.key, rowKey, (row) =>
        updateRowMemberCount(row, memberCount)
      ),
    }));
  };

  const toggleFormationMember = (itemKey: number, rowKey: number, memberId: string) => {
    dispatchOriginalMemberOp({ type: "inputChanged", itemKey });
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
      dispatchOriginalMemberOp({ type: "inputChanged", itemKey });
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

  // 「オリメン」= 楽曲参加メンバー（#425）。反映内容の確定はサーバで行い、
  // ここは確定済みの結果を state へ適用して通知を残すだけにする（#424）。
  // 「オリメン」= 楽曲参加メンバー（#425）。反映内容の確定はサーバで行い、
  // ここは確定済みの結果を state へ適用するだけにする（#424）。
  //
  // 実行中は対象項目の削除・再実行をUIで無効化する。
  // 楽曲変更や披露メンバー・フォーメーションの手動編集は操作をキャンセルし、
  // 後から届く応答を requestId 不一致として破棄する。
  const applyOriginalMembers = async (itemKey: number, trackId: string) => {
    if (!trackId) return;
    // 保存はこの時点の items をペイロード化済みなので、保存中に反映しても
    // その結果は保存されず、成功後の redirect で失われる。開始させない。
    if (isSubmitting) return;

    const target = items.find((item) => item.key === itemKey);
    const hasExistingInput =
      Boolean(target) &&
      (target!.members.length > 0 ||
        target!.formationRows.some((row) => row.memberIds.length > 0));
    if (hasExistingInput) {
      const confirmed = window.confirm(
        "既存の披露メンバーとフォーメーションを楽曲マスタの内容で上書きします。よろしいですか？"
      );
      if (!confirmed) return;
    }

    originalMemberRequestIdRef.current += 1;
    const requestId = originalMemberRequestIdRef.current;
    dispatchOriginalMemberOp({ type: "started", itemKey, trackId, requestId });

    let result: OriginalMembersActionResult;
    try {
      result = await resolveOriginalMembers(trackId, live.id, performanceId);
    } catch {
      // 技術的な失敗は業務上の未登録通知へ変換しない（誤った編集導線を出さない）
      dispatchOriginalMemberOp({ type: "failed", itemKey, requestId });
      return;
    }

    if (result.status === "invalid-input") {
      dispatchOriginalMemberOp({ type: "failed", itemKey, requestId });
      return;
    }

    // 応答が現在の操作のものでなければ、項目へ適用しない。
    // reducer 側も同じ判定で resolved を無視するため、通知も残らない。
    const isCurrent = isCurrentRequest(
      originalMemberOpsRef.current,
      itemKey,
      requestId
    );

    if (isCurrent && result.status === "applied") {
      updateItem(itemKey, (item) => ({
        ...item,
        members: result.members.map((member) => ({ ...member })),
        formationRows: result.formationRows.map((row) => ({
          key: nextKey(),
          memberCount: row.memberCount,
          memberIds: [...row.memberIds],
        })),
      }));
    }
    dispatchOriginalMemberOp({ type: "resolved", itemKey, requestId, result });
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
    dispatchOriginalMemberOp({ type: "itemsReplaced" });
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
            disabled={hasPendingOperation(originalMemberOps)}
            className="rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={isItemPending(originalMemberOps, item.key)}
                  className="px-1 text-xs text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
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
                    onChange={(trackId) => changeTrackId(item.key, trackId)}
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
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setAllMembers(item.key)}
                      >
                        全員
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => applyOriginalMembers(item.key, item.trackId)}
                        disabled={
                          !item.trackId ||
                          isSubmitting ||
                          isItemPending(originalMemberOps, item.key)
                        }
                      >
                        {isItemPending(originalMemberOps, item.key)
                          ? "反映中…"
                          : "オリメン"}
                      </Button>
                    </div>
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
                  {(() => {
                    const outcome = getOperationOutcome(originalMemberOps, item.key);
                    if (!outcome) return null;
                    if (outcome.kind === "failed") {
                      return (
                        <p className="mt-1 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground">
                          反映に失敗しました。時間をおいて再度お試しください。
                        </p>
                      );
                    }
                    return (
                      <OriginalMembersNotice
                        result={outcome.result}
                        liveId={live.id}
                        trackId={item.trackId}
                      />
                    );
                  })()}
                </div>

                <div className="space-y-2 rounded-lg border border-foreground/10 p-2">
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => copyCostumeFromPrevious(index)}
                  className="shrink-0"
                >
                  上と同じ
                </Button>
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

      <Button
        type="submit"
        disabled={isSubmitting || hasPendingOperation(originalMemberOps)}
        className="w-full"
      >
        {isSubmitting ? "保存中..." : "保存する"}
      </Button>
    </form>
  );
}
