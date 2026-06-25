"use client";

import { useRef, useState } from "react";
import type { ValidationError } from "@/types/errors";
import type { Group } from "@/types/group";
import type { MemberOption } from "@/types/member";
import type { VenueOption } from "@/types/venue";
import type { SongOption } from "@/types/song";
import {
  LIVE_TYPE_LABELS,
  LIVE_TYPE_VALUES,
  SETLIST_ITEM_TYPE_LABELS,
  SETLIST_ITEM_TYPE_VALUES,
  type CreateLiveInput,
  type LiveType,
  type SetlistItemType,
} from "@/types/live";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type LiveFormProps = {
  mode: "create" | "edit";
  groups: Group[];
  members: MemberOption[];
  venues: VenueOption[];
  tracks: SongOption[];
  initialValues?: CreateLiveInput;
  onSubmit: (
    values: CreateLiveInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

type AbsenceField = { key: number; memberId: string; note: string };
type SetlistItemField = {
  key: number;
  itemType: SetlistItemType;
  trackId: string;
  songTitle: string;
  note: string;
};
type PerformanceField = {
  key: number;
  venueId: string;
  performanceDate: string;
  doorsOpenAt: string;
  startsAt: string;
  sessionLabel: string;
  hasStreaming: boolean;
  hasLiveViewing: boolean;
  ticketInfo: string;
  seatInfo: string;
  absences: AbsenceField[];
  setlistItems: SetlistItemField[];
};

const inputClass =
  "w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground";

export function LiveForm({
  mode,
  groups,
  members,
  venues,
  tracks,
  initialValues,
  onSubmit,
}: LiveFormProps) {
  const keyRef = useRef(0);
  const nextKey = () => {
    keyRef.current += 1;
    return keyRef.current;
  };

  const [name, setName] = useState(initialValues?.name ?? "");
  const [liveType, setLiveType] = useState<LiveType | "">(
    initialValues?.liveType ?? ""
  );
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [performerGroupIds, setPerformerGroupIds] = useState<string[]>(
    initialValues?.performerGroupIds ?? []
  );
  const [performerMemberIds, setPerformerMemberIds] = useState<string[]>(
    initialValues?.performerMemberIds ?? []
  );
  const [performances, setPerformances] = useState<PerformanceField[]>(() =>
    (initialValues?.performances ?? []).map((performance) => ({
      key: nextKey(),
      venueId: performance.venueId,
      performanceDate: performance.performanceDate,
      doorsOpenAt: performance.doorsOpenAt,
      startsAt: performance.startsAt,
      sessionLabel: performance.sessionLabel,
      hasStreaming: performance.hasStreaming,
      hasLiveViewing: performance.hasLiveViewing,
      ticketInfo: performance.ticketInfo,
      seatInfo: performance.seatInfo,
      absences: performance.absences.map((absence) => ({
        key: nextKey(),
        memberId: absence.memberId,
        note: absence.note,
      })),
      setlistItems: performance.setlistItems.map((item) => ({
        key: nextKey(),
        itemType: item.itemType,
        trackId: item.trackId,
        songTitle: item.songTitle,
        note: item.note,
      })),
    }))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleId = (
    list: string[],
    setter: (next: string[]) => void,
    id: string
  ) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const addPerformance = () => {
    setPerformances((prev) => [
      ...prev,
      {
        key: nextKey(),
        venueId: "",
        performanceDate: "",
        doorsOpenAt: "",
        startsAt: "",
        sessionLabel: "",
        hasStreaming: false,
        hasLiveViewing: false,
        ticketInfo: "",
        seatInfo: "",
        absences: [],
        setlistItems: [],
      },
    ]);
  };

  const updatePerformance = (
    key: number,
    patch: Partial<PerformanceField>
  ) => {
    setPerformances((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch } : p))
    );
  };

  const removePerformance = (key: number) => {
    setPerformances((prev) => prev.filter((p) => p.key !== key));
  };

  const addAbsence = (performanceKey: number) => {
    setPerformances((prev) =>
      prev.map((p) =>
        p.key === performanceKey
          ? {
              ...p,
              absences: [...p.absences, { key: nextKey(), memberId: "", note: "" }],
            }
          : p
      )
    );
  };

  const updateAbsence = (
    performanceKey: number,
    absenceKey: number,
    patch: Partial<AbsenceField>
  ) => {
    setPerformances((prev) =>
      prev.map((p) =>
        p.key === performanceKey
          ? {
              ...p,
              absences: p.absences.map((a) =>
                a.key === absenceKey ? { ...a, ...patch } : a
              ),
            }
          : p
      )
    );
  };

  const removeAbsence = (performanceKey: number, absenceKey: number) => {
    setPerformances((prev) =>
      prev.map((p) =>
        p.key === performanceKey
          ? { ...p, absences: p.absences.filter((a) => a.key !== absenceKey) }
          : p
      )
    );
  };

  const addSetlistItem = (performanceKey: number) => {
    setPerformances((prev) =>
      prev.map((p) =>
        p.key === performanceKey
          ? {
              ...p,
              setlistItems: [
                ...p.setlistItems,
                { key: nextKey(), itemType: "song", trackId: "", songTitle: "", note: "" },
              ],
            }
          : p
      )
    );
  };

  const updateSetlistItem = (
    performanceKey: number,
    itemKey: number,
    patch: Partial<SetlistItemField>
  ) => {
    setPerformances((prev) =>
      prev.map((p) =>
        p.key === performanceKey
          ? {
              ...p,
              setlistItems: p.setlistItems.map((item) =>
                item.key === itemKey ? { ...item, ...patch } : item
              ),
            }
          : p
      )
    );
  };

  const moveSetlistItem = (
    performanceKey: number,
    itemKey: number,
    direction: -1 | 1
  ) => {
    setPerformances((prev) =>
      prev.map((p) => {
        if (p.key !== performanceKey) return p;
        const index = p.setlistItems.findIndex((item) => item.key === itemKey);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= p.setlistItems.length) return p;
        const next = [...p.setlistItems];
        [next[index], next[target]] = [next[target], next[index]];
        return { ...p, setlistItems: next };
      })
    );
  };

  const removeSetlistItem = (performanceKey: number, itemKey: number) => {
    setPerformances((prev) =>
      prev.map((p) =>
        p.key === performanceKey
          ? { ...p, setlistItems: p.setlistItems.filter((item) => item.key !== itemKey) }
          : p
      )
    );
  };

  const rosterMembers = members.filter((member) =>
    performerMemberIds.includes(member.id)
  );
  const absenceCandidates = rosterMembers.length > 0 ? rosterMembers : members;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const values: CreateLiveInput = {
      name,
      liveType,
      description,
      performerGroupIds,
      performerMemberIds,
      performances: performances.map((performance) => ({
        venueId: performance.venueId,
        performanceDate: performance.performanceDate,
        doorsOpenAt: performance.doorsOpenAt,
        startsAt: performance.startsAt,
        sessionLabel: performance.sessionLabel,
        hasStreaming: performance.hasStreaming,
        hasLiveViewing: performance.hasLiveViewing,
        ticketInfo: performance.ticketInfo,
        seatInfo: performance.seatInfo,
        absences: performance.absences
          .filter((absence) => absence.memberId)
          .map((absence) => ({ memberId: absence.memberId, note: absence.note })),
        setlistItems: performance.setlistItems.map((item) => ({
          itemType: item.itemType,
          trackId: item.trackId,
          songTitle: item.songTitle,
          note: item.note,
        })),
      })),
    };

    try {
      const result = await onSubmit(values);
      if (result.errors) {
        const errorMap: Record<string, string> = {};
        for (const err of result.errors) {
          errorMap[err.field] = err.message;
        }
        setErrors(errorMap);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors._form && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errors._form}
        </p>
      )}

      <Input
        id="name"
        label="ライブ名*"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          種別*
        </label>
        {errors.liveType && (
          <p className="mb-1 text-xs text-red-500">{errors.liveType}</p>
        )}
        <select
          value={liveType}
          onChange={(e) => setLiveType(e.target.value as LiveType | "")}
          className={inputClass}
        >
          <option value="">選択してください</option>
          {LIVE_TYPE_VALUES.map((type) => (
            <option key={type} value={type}>
              {LIVE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <Textarea
        id="description"
        label="説明"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          出演グループ
        </label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-foreground/10 p-3 sm:grid-cols-3">
          {groups.map((group) => (
            <label key={group.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={performerGroupIds.includes(group.id)}
                onChange={() => toggleId(performerGroupIds, setPerformerGroupIds, group.id)}
              />
              <span className="text-foreground">{group.nameJa}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          出演メンバー（基準ロスター）
        </label>
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-foreground/10 p-3 sm:grid-cols-3">
          {members.map((member) => (
            <label key={member.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={performerMemberIds.includes(member.id)}
                onChange={() => toggleId(performerMemberIds, setPerformerMemberIds, member.id)}
              />
              <span className="text-foreground">{member.nameJa}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground/70">公演</label>
          <Button type="button" variant="secondary" onClick={addPerformance}>
            公演を追加
          </Button>
        </div>

        {performances.map((performance, index) => (
          <div
            key={performance.key}
            className="space-y-3 rounded-lg border border-foreground/10 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/70">
                公演 {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removePerformance(performance.key)}
                className="text-sm text-red-500 hover:underline"
              >
                削除
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-foreground/60">会場</label>
                <select
                  value={performance.venueId}
                  onChange={(e) =>
                    updatePerformance(performance.key, { venueId: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">未設定</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                id={`performance-${performance.key}-date`}
                label="公演日*"
                type="date"
                value={performance.performanceDate}
                onChange={(e) =>
                  updatePerformance(performance.key, {
                    performanceDate: e.target.value,
                  })
                }
                error={errors[`performances.${index}.performanceDate`]}
              />
              <Input
                id={`performance-${performance.key}-doors`}
                label="開場 (HH:MM)"
                value={performance.doorsOpenAt}
                onChange={(e) =>
                  updatePerformance(performance.key, { doorsOpenAt: e.target.value })
                }
                error={errors[`performances.${index}.doorsOpenAt`]}
              />
              <Input
                id={`performance-${performance.key}-starts`}
                label="開演 (HH:MM)"
                value={performance.startsAt}
                onChange={(e) =>
                  updatePerformance(performance.key, { startsAt: e.target.value })
                }
                error={errors[`performances.${index}.startsAt`]}
              />
              <Input
                id={`performance-${performance.key}-session`}
                label="昼夜ラベル"
                value={performance.sessionLabel}
                onChange={(e) =>
                  updatePerformance(performance.key, { sessionLabel: e.target.value })
                }
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={performance.hasStreaming}
                  onChange={(e) =>
                    updatePerformance(performance.key, {
                      hasStreaming: e.target.checked,
                    })
                  }
                />
                <span className="text-foreground">配信あり</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={performance.hasLiveViewing}
                  onChange={(e) =>
                    updatePerformance(performance.key, {
                      hasLiveViewing: e.target.checked,
                    })
                  }
                />
                <span className="text-foreground">ライブビューイングあり</span>
              </label>
            </div>

            <Textarea
              id={`performance-${performance.key}-ticket`}
              label="チケット情報"
              value={performance.ticketInfo}
              onChange={(e) =>
                updatePerformance(performance.key, { ticketInfo: e.target.value })
              }
            />
            <Textarea
              id={`performance-${performance.key}-seat`}
              label="座席情報"
              value={performance.seatInfo}
              onChange={(e) =>
                updatePerformance(performance.key, { seatInfo: e.target.value })
              }
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/60">休演メンバー</span>
                <button
                  type="button"
                  onClick={() => addAbsence(performance.key)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  休演を追加
                </button>
              </div>
              {errors[`performances.${index}.absences`] && (
                <p className="text-xs text-red-500">
                  {errors[`performances.${index}.absences`]}
                </p>
              )}
              {performance.absences.map((absence) => (
                <div key={absence.key} className="flex flex-wrap items-center gap-2">
                  <select
                    value={absence.memberId}
                    onChange={(e) =>
                      updateAbsence(performance.key, absence.key, {
                        memberId: e.target.value,
                      })
                    }
                    className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    <option value="">メンバー選択</option>
                    {absenceCandidates.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.nameJa}
                      </option>
                    ))}
                  </select>
                  <input
                    value={absence.note}
                    onChange={(e) =>
                      updateAbsence(performance.key, absence.key, {
                        note: e.target.value,
                      })
                    }
                    placeholder="理由・メモ（任意）"
                    className="flex-1 rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
                  />
                  <button
                    type="button"
                    onClick={() => removeAbsence(performance.key, absence.key)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/60">セットリスト</span>
                <button
                  type="button"
                  onClick={() => addSetlistItem(performance.key)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  項目を追加
                </button>
              </div>
              {performance.setlistItems.map((item, itemIndex) => (
                <div
                  key={item.key}
                  className="space-y-2 rounded-lg border border-foreground/10 p-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-foreground/50">{itemIndex + 1}</span>
                    <select
                      value={item.itemType}
                      onChange={(e) =>
                        updateSetlistItem(performance.key, item.key, {
                          itemType: e.target.value as SetlistItemType,
                        })
                      }
                      className="rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground"
                    >
                      {SETLIST_ITEM_TYPE_VALUES.map((type) => (
                        <option key={type} value={type}>
                          {SETLIST_ITEM_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveSetlistItem(performance.key, item.key, -1)}
                        className="px-1 text-xs text-foreground/60 hover:text-foreground"
                        aria-label="上へ"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSetlistItem(performance.key, item.key, 1)}
                        className="px-1 text-xs text-foreground/60 hover:text-foreground"
                        aria-label="下へ"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSetlistItem(performance.key, item.key)}
                        className="px-1 text-xs text-red-500 hover:underline"
                      >
                        削除
                      </button>
                    </div>
                  </div>

                  {item.itemType === "song" ? (
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={item.trackId}
                        onChange={(e) =>
                          updateSetlistItem(performance.key, item.key, {
                            trackId: e.target.value,
                          })
                        }
                        className="rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground"
                      >
                        <option value="">登録曲から選択</option>
                        {tracks.map((track) => (
                          <option key={track.id} value={track.id}>
                            {track.title}
                          </option>
                        ))}
                      </select>
                      <input
                        value={item.songTitle}
                        onChange={(e) =>
                          updateSetlistItem(performance.key, item.key, {
                            songTitle: e.target.value,
                          })
                        }
                        placeholder="未登録曲は曲名を入力"
                        className="flex-1 rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
                      />
                    </div>
                  ) : null}

                  <input
                    value={item.note}
                    onChange={(e) =>
                      updateSetlistItem(performance.key, item.key, {
                        note: e.target.value,
                      })
                    }
                    placeholder={
                      item.itemType === "song" ? "メモ（任意）" : "内容・メモ"
                    }
                    className="w-full rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
                  />
                  {errors[`performances.${index}.setlistItems.${itemIndex}`] && (
                    <p className="text-xs text-red-500">
                      {errors[`performances.${index}.setlistItems.${itemIndex}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
