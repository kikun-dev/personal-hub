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
  PERFORMANCE_STYLE_LABELS,
  PERFORMANCE_STYLE_VALUES,
  SETLIST_ITEM_TYPE_LABELS,
  SETLIST_ITEM_TYPE_VALUES,
  type CreateLiveInput,
  type CreateSetlistMemberInput,
  type LiveType,
  type PerformanceStyle,
  type SetlistItemType,
} from "@/types/live";
import { Combobox } from "@/components/ui/Combobox";
import { computeLiveRosterAction } from "@/app/(authenticated)/admin/lives/rosterAction";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { addKeyedItem, removeKeyedItem, updateKeyedItem } from "@/lib/keyedList";
import { toErrorMap } from "@/hooks/useAdminForm";

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
  performanceStyle: PerformanceStyle | "";
  members: CreateSetlistMemberInput[];
};
type PerformanceField = {
  key: number;
  // 既存公演の編集時のみ設定（048で公演IDを維持するupsertに使う）。keyはUI内部の
  // React key用の識別子であり、idはDBの公演IDを表す別物。新規追加の公演はid無し。
  id?: string;
  venueId: string;
  performanceDate: string;
  doorsOpenAt: string;
  startsAt: string;
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
      id: performance.id,
      venueId: performance.venueId,
      performanceDate: performance.performanceDate,
      doorsOpenAt: performance.doorsOpenAt,
      startsAt: performance.startsAt,
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
        performanceStyle: item.performanceStyle,
        members: item.members.map((member) => ({ ...member })),
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
    setPerformances((prev) =>
      addKeyedItem(prev, {
        key: nextKey(),
        venueId: "",
        performanceDate: "",
        doorsOpenAt: "",
        startsAt: "",
        hasStreaming: false,
        hasLiveViewing: false,
        ticketInfo: "",
        seatInfo: "",
        absences: [],
        setlistItems: [],
      })
    );
  };

  const updatePerformance = (
    key: number,
    patch: Partial<PerformanceField>
  ) => {
    setPerformances((prev) => updateKeyedItem(prev, (p) => p.key, key, patch));
  };

  const removePerformance = (key: number) => {
    setPerformances((prev) => removeKeyedItem(prev, (p) => p.key, key));
  };

  const addAbsence = (performanceKey: number) => {
    setPerformances((prev) =>
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => ({
        ...p,
        absences: addKeyedItem(p.absences, { key: nextKey(), memberId: "", note: "" }),
      }))
    );
  };

  const updateAbsence = (
    performanceKey: number,
    absenceKey: number,
    patch: Partial<AbsenceField>
  ) => {
    setPerformances((prev) =>
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => ({
        ...p,
        absences: updateKeyedItem(p.absences, (a) => a.key, absenceKey, patch),
      }))
    );
  };

  const removeAbsence = (performanceKey: number, absenceKey: number) => {
    setPerformances((prev) =>
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => ({
        ...p,
        absences: removeKeyedItem(p.absences, (a) => a.key, absenceKey),
      }))
    );
  };

  const addSetlistItem = (performanceKey: number) => {
    setPerformances((prev) =>
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => ({
        ...p,
        setlistItems: addKeyedItem(p.setlistItems, {
          key: nextKey(),
          itemType: "song",
          trackId: "",
          songTitle: "",
          note: "",
          performanceStyle: "",
          members: [],
        }),
      }))
    );
  };

  const updateSetlistItem = (
    performanceKey: number,
    itemKey: number,
    patch: Partial<SetlistItemField>
  ) => {
    setPerformances((prev) =>
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => ({
        ...p,
        setlistItems: updateKeyedItem(p.setlistItems, (item) => item.key, itemKey, patch),
      }))
    );
  };

  const moveSetlistItem = (
    performanceKey: number,
    itemKey: number,
    direction: -1 | 1
  ) => {
    setPerformances((prev) =>
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => {
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
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => ({
        ...p,
        setlistItems: removeKeyedItem(p.setlistItems, (item) => item.key, itemKey),
      }))
    );
  };

  const toggleSetlistMember = (
    performanceKey: number,
    itemKey: number,
    memberId: string
  ) => {
    setPerformances((prev) =>
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => ({
        ...p,
        setlistItems: updateKeyedItem(p.setlistItems, (item) => item.key, itemKey, (item) => {
          const exists = item.members.some((m) => m.memberId === memberId);
          return {
            ...item,
            members: exists
              ? item.members.filter((m) => m.memberId !== memberId)
              : [...item.members, { memberId, isCenter: false }],
          };
        }),
      }))
    );
  };

  const toggleSetlistCenter = (
    performanceKey: number,
    itemKey: number,
    memberId: string
  ) => {
    setPerformances((prev) =>
      updateKeyedItem(prev, (p) => p.key, performanceKey, (p) => ({
        ...p,
        setlistItems: updateKeyedItem(p.setlistItems, (item) => item.key, itemKey, (item) => ({
          ...item,
          members: item.members.map((m) =>
            m.memberId === memberId ? { ...m, isCenter: !m.isCenter } : m
          ),
        })),
      }))
    );
  };

  const rosterMembers = members.filter((member) =>
    performerMemberIds.includes(member.id)
  );
  const absenceCandidates = rosterMembers.length > 0 ? rosterMembers : members;
  const membersById = new Map(members.map((member) => [member.id, member]));

  // 披露メンバー候補 = ロスター候補 ∪ 選択済み（ロスター外でも解除できるよう表示）
  const setlistMemberCandidates = (item: SetlistItemField): MemberOption[] => {
    const candidateIds = new Set(absenceCandidates.map((member) => member.id));
    const extras = item.members
      .filter((member) => member.memberId && !candidateIds.has(member.memberId))
      .map((member) => membersById.get(member.memberId))
      .filter((member): member is MemberOption => Boolean(member));
    return [...absenceCandidates, ...extras];
  };

  const [isComputingRoster, setIsComputingRoster] = useState(false);
  // 自動計算の基準日 = 最初の公演日
  const earliestPerformanceDate =
    performances
      .map((performance) => performance.performanceDate)
      .filter((date) => date !== "")
      .sort((a, b) => a.localeCompare(b))[0] ?? "";
  const canAutoRoster =
    performerGroupIds.length > 0 && earliestPerformanceDate !== "";

  const handleAutoRoster = async () => {
    if (!canAutoRoster) return;
    setIsComputingRoster(true);
    try {
      const { memberIds } = await computeLiveRosterAction(
        performerGroupIds,
        earliestPerformanceDate
      );
      // 既存の選択は残しつつ、算出メンバーを追加（その後手動調整）
      setPerformerMemberIds((prev) => [...new Set([...prev, ...memberIds])]);
    } finally {
      setIsComputingRoster(false);
    }
  };

  // 種別ごとの時間ラベル（フェス=出演時刻 / 配信=配信時刻、いずれも開場は出さない）
  const hideDoorsOpen = liveType === "festival" || liveType === "online";
  const startsLabel =
    liveType === "online"
      ? "配信時刻 (HH:MM)"
      : liveType === "festival"
        ? "出演時刻 (HH:MM)"
        : "開演 (HH:MM)";

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
        id: performance.id,
        venueId: performance.venueId,
        performanceDate: performance.performanceDate,
        // 開場を出さない種別（フェス/配信）では送信時にクリアする
        doorsOpenAt: hideDoorsOpen ? "" : performance.doorsOpenAt,
        startsAt: performance.startsAt,
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
          performanceStyle: item.performanceStyle,
          members: item.members,
        })),
      })),
    };

    try {
      const result = await onSubmit(values);
      if (result.errors) {
        setErrors(toErrorMap(result.errors));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormErrorBanner message={errors._form} />

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
        <p className="mt-1 text-xs text-foreground/50">
          単発ライブ＝1会場（複数日可）／ツアー＝複数会場／配信は複数日程可
        </p>
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
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm font-medium text-foreground/70">
            出演メンバー（基準ロスター）
          </label>
          <button
            type="button"
            onClick={handleAutoRoster}
            disabled={!canAutoRoster || isComputingRoster}
            className="rounded-lg border border-foreground/10 px-2 py-1 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40"
          >
            {isComputingRoster ? "計算中..." : "出演グループ・最初の公演日から自動入力"}
          </button>
        </div>
        {!canAutoRoster && (
          <p className="mb-1 text-xs text-foreground/40">
            ※自動入力には出演グループの選択と公演日の入力が必要です
          </p>
        )}
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground/70">
            日程・会場（事前情報）
          </label>
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
                <Combobox
                  value={performance.venueId}
                  onChange={(venueId) =>
                    updatePerformance(performance.key, { venueId })
                  }
                  options={venues.map((venue) => ({
                    value: venue.id,
                    label: venue.name,
                  }))}
                  ariaLabel="会場を検索"
                  placeholder="会場を検索"
                  emptyLabel="未設定"
                />
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
              {!hideDoorsOpen && (
                <Input
                  id={`performance-${performance.key}-doors`}
                  label="開場 (HH:MM)"
                  value={performance.doorsOpenAt}
                  onChange={(e) =>
                    updatePerformance(performance.key, { doorsOpenAt: e.target.value })
                  }
                  error={errors[`performances.${index}.doorsOpenAt`]}
                />
              )}
              <Input
                id={`performance-${performance.key}-starts`}
                label={startsLabel}
                value={performance.startsAt}
                onChange={(e) =>
                  updatePerformance(performance.key, { startsAt: e.target.value })
                }
                error={errors[`performances.${index}.startsAt`]}
              />
            </div>

          </div>
        ))}
      </section>

      <section className="space-y-3">
        <label className="block text-sm font-medium text-foreground/70">
          公演ごとの当日情報
        </label>
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
          {performances.map((performance, index) => (
            <div
              key={performance.key}
              className="w-[22rem] shrink-0 snap-start space-y-3 rounded-lg border border-foreground/10 p-4"
            >
              <p className="text-sm font-medium text-foreground/70">
                公演 {index + 1}
                {performance.performanceDate ? ` ・ ${performance.performanceDate}` : ""}
              </p>
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
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Combobox
                          value={item.trackId}
                          onChange={(trackId) =>
                            updateSetlistItem(performance.key, item.key, {
                              trackId,
                            })
                          }
                          options={tracks.map((track) => ({
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
                          onChange={(e) =>
                            updateSetlistItem(performance.key, item.key, {
                              songTitle: e.target.value,
                            })
                          }
                          placeholder="未登録曲は曲名を入力"
                          className="flex-1 rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
                        />
                        <select
                          value={item.performanceStyle}
                          onChange={(e) =>
                            updateSetlistItem(performance.key, item.key, {
                              performanceStyle: e.target.value as PerformanceStyle | "",
                            })
                          }
                          aria-label="披露タイプ"
                          className="rounded-lg border border-foreground/10 bg-background px-2 py-1.5 text-sm text-foreground"
                        >
                          <option value="">披露タイプ</option>
                          {PERFORMANCE_STYLE_VALUES.map((style) => (
                            <option key={style} value={style}>
                              {PERFORMANCE_STYLE_LABELS[style]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-lg border border-foreground/10 p-2">
                        <p className="mb-1 text-xs text-foreground/50">
                          披露メンバー（C=センター）
                        </p>
                        <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
                          {setlistMemberCandidates(item).map((candidate) => {
                            const selected = item.members.find(
                              (m) => m.memberId === candidate.id
                            );
                            return (
                              <div
                                key={candidate.id}
                                className="flex items-center gap-1 text-xs"
                              >
                                <label className="flex flex-1 cursor-pointer items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(selected)}
                                    onChange={() =>
                                      toggleSetlistMember(
                                        performance.key,
                                        item.key,
                                        candidate.id
                                      )
                                    }
                                  />
                                  <span className="text-foreground">
                                    {candidate.nameJa}
                                  </span>
                                </label>
                                {selected && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleSetlistCenter(
                                        performance.key,
                                        item.key,
                                        candidate.id
                                      )
                                    }
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
                    </>
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
      </section>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
