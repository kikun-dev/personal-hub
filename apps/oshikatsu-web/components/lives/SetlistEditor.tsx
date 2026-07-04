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
import { addKeyedItem, removeKeyedItem, updateKeyedItem } from "@/lib/keyedList";
import { toErrorMap } from "@/hooks/useAdminForm";

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

type FormationRowField = { key: number; memberIds: string[] };

type SetlistItemField = {
  key: number;
  itemType: SetlistItemType;
  trackId: string;
  songTitle: string;
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
    songTitle: item.songTitle,
    note: item.note,
    section: item.section,
    performanceStyles: item.performanceStyles,
    costumeNote: item.costumeNote,
    members: item.members.map((member) => ({ ...member })),
    formationRows: item.formationRows.map((row) => ({
      key: nextKey(),
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

  // フォーメーション行の候補も同様に、ロスター ∪ 選択済み extras
  const formationCandidates = (row: FormationRowField): RosterMember[] => {
    const extras = row.memberIds
      .filter((memberId) => !rosterIds.has(memberId))
      .map((memberId) => ({
        memberId,
        memberNameJa: rosterById.get(memberId)?.memberNameJa ?? memberId,
      }));
    return [...roster, ...extras];
  };

  const addItem = (itemType: SetlistItemType) => {
    setItems((prev) =>
      addKeyedItem(prev, {
        key: nextKey(),
        itemType,
        trackId: "",
        songTitle: "",
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
    setItems((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeItem = (key: number) => {
    setItems((prev) => removeKeyedItem(prev, (item) => item.key, key));
  };

  const toggleMember = (itemKey: number, memberId: string) => {
    updateItem(itemKey, (item) => {
      const exists = item.members.some((member) => member.memberId === memberId);
      return {
        ...item,
        members: exists
          ? item.members.filter((member) => member.memberId !== memberId)
          : [...item.members, { memberId, isCenter: false }],
      };
    });
  };

  const toggleCenter = (itemKey: number, memberId: string) => {
    updateItem(itemKey, (item) => ({
      ...item,
      members: item.members.map((member) =>
        member.memberId === memberId ? { ...member, isCenter: !member.isCenter } : member
      ),
    }));
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
      formationRows: addKeyedItem(item.formationRows, { key: nextKey(), memberIds: [] }),
    }));
  };

  const removeFormationRow = (itemKey: number, rowKey: number) => {
    updateItem(itemKey, (item) => ({
      ...item,
      formationRows: removeKeyedItem(item.formationRows, (row) => row.key, rowKey),
    }));
  };

  const toggleFormationMember = (itemKey: number, rowKey: number, memberId: string) => {
    updateItem(itemKey, (item) => ({
      ...item,
      formationRows: updateKeyedItem(item.formationRows, (row) => row.key, rowKey, (row) => {
        const exists = row.memberIds.includes(memberId);
        return {
          ...row,
          memberIds: exists
            ? row.memberIds.filter((id) => id !== memberId)
            : [...row.memberIds, memberId],
        };
      }),
    }));
  };

  const moveFormationMember = (
    itemKey: number,
    rowKey: number,
    memberId: string,
    direction: -1 | 1
  ) => {
    updateItem(itemKey, (item) => ({
      ...item,
      formationRows: updateKeyedItem(item.formationRows, (row) => row.key, rowKey, (row) => {
        const index = row.memberIds.indexOf(memberId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= row.memberIds.length) return row;
        const next = [...row.memberIds];
        [next[index], next[target]] = [next[target], next[index]];
        return { ...row, memberIds: next };
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
      updateItem(itemKey, {
        formationRows: result.rows
          .map((row) => ({
            key: nextKey(),
            memberIds: filterToRoster
              ? row.memberIds.filter((id) => rosterIds.has(id))
              : row.memberIds,
          }))
          .filter((row) => row.memberIds.length > 0),
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
      songTitle: item.songTitle,
      note: item.note,
      section: item.section,
      performanceStyles: item.performanceStyles,
      costumeNote: item.costumeNote,
      members: item.members,
      formationRows: item.formationRows.map((row) => ({ memberIds: row.memberIds })),
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
                  <input
                    value={item.songTitle}
                    onChange={(e) => updateItem(item.key, { songTitle: e.target.value })}
                    placeholder="未登録曲は曲名を入力"
                    className="flex-1 rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
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
                      className="text-xs text-blue-500 hover:underline"
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
                              className={`rounded px-1 ${
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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-foreground/50">フォーメーション</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyFormationFromTrack(item.key, item.trackId)}
                        disabled={!item.trackId || copyingFormationKeys.has(item.key)}
                        className="text-xs text-blue-500 hover:underline disabled:cursor-not-allowed disabled:text-foreground/30 disabled:no-underline"
                      >
                        楽曲マスタからコピー
                      </button>
                      <button
                        type="button"
                        onClick={() => addFormationRow(item.key)}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        列を追加
                      </button>
                    </div>
                  </div>
                  {item.formationRows.map((row, rowIndex) => (
                    <div
                      key={row.key}
                      className="space-y-1 rounded border border-foreground/10 p-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground/50">
                          {rowIndex + 1}列目
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFormationRow(item.key, row.key)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          削除
                        </button>
                      </div>
                      <div className="grid max-h-32 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
                        {formationCandidates(row).map((candidate) => (
                          <label
                            key={candidate.memberId}
                            className="flex cursor-pointer items-center gap-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={row.memberIds.includes(candidate.memberId)}
                              onChange={() =>
                                toggleFormationMember(item.key, row.key, candidate.memberId)
                              }
                            />
                            <span className="text-foreground">
                              {candidate.memberNameJa}
                            </span>
                          </label>
                        ))}
                      </div>
                      {row.memberIds.length > 0 && (
                        <ol className="space-y-1 text-xs text-foreground/70">
                          {row.memberIds.map((memberId, memberIndex) => (
                            <li key={memberId} className="flex items-center gap-2">
                              <span>
                                {memberIndex + 1}.{" "}
                                {rosterById.get(memberId)?.memberNameJa ?? memberId}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  moveFormationMember(item.key, row.key, memberId, -1)
                                }
                                className="px-1 text-foreground/60 hover:text-foreground"
                                aria-label="前へ"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  moveFormationMember(item.key, row.key, memberId, 1)
                                }
                                className="px-1 text-foreground/60 hover:text-foreground"
                                aria-label="後へ"
                              >
                                ↓
                              </button>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
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
                  className="shrink-0 text-xs text-blue-500 hover:underline"
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
