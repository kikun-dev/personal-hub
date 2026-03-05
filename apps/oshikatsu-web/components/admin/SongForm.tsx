"use client";

import { useState } from "react";
import type { Group } from "@/types/group";
import type { MemberWithGroups } from "@/types/member";
import type { CreateSongInput, CreateSongMemberInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { SONG_POSITIONS } from "@/lib/constants";
import type { SongPosition } from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

type FormSongMember = CreateSongMemberInput & { _key: string };

type FormValues = Omit<CreateSongInput, "members"> & {
  members: FormSongMember[];
};

type SongFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateSongInput;
  groups: Group[];
  members: MemberWithGroups[];
  onSubmit: (
    values: CreateSongInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function withKey(member: CreateSongMemberInput): FormSongMember {
  return { ...member, _key: crypto.randomUUID() };
}

function getDefaultValues(): FormValues {
  return {
    title: "",
    lyricsBy: "",
    musicBy: "",
    releaseDate: "",
    groupIds: [],
    members: [],
  };
}

function toFormValues(input: CreateSongInput): FormValues {
  return {
    ...input,
    members: input.members.map(withKey),
  };
}

function toSubmitValues(form: FormValues): CreateSongInput {
  // Recalculate positionOrder: index within each position group
  const positionCounters = new Map<string, number>();
  const members = form.members.map((m) => {
    const count = positionCounters.get(m.position) ?? 0;
    positionCounters.set(m.position, count + 1);
    return {
      memberId: m.memberId,
      position: m.position,
      positionOrder: String(count),
      isCenter: m.isCenter,
    };
  });

  return {
    title: form.title,
    lyricsBy: form.lyricsBy,
    musicBy: form.musicBy,
    releaseDate: form.releaseDate,
    groupIds: form.groupIds,
    members,
  };
}

export function SongForm({
  mode,
  initialValues,
  groups,
  members,
  onSubmit,
}: SongFormProps) {
  const [values, setValues] = useState<FormValues>(
    () => initialValues ? toFormValues(initialValues) : getDefaultValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const toggleGroupId = (groupId: string) => {
    setValues((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.groupIds;
      return next;
    });
  };

  // Get assigned member IDs for exclusion
  const assignedMemberIds = new Set(
    values.members.map((m) => m.memberId).filter(Boolean)
  );

  const getMembersForPosition = (position: SongPosition): FormSongMember[] => {
    return values.members.filter((m) => m.position === position);
  };

  const addMember = (position: SongPosition) => {
    setValues((prev) => ({
      ...prev,
      members: [
        ...prev.members,
        withKey({
          memberId: "",
          position,
          positionOrder: "0",
          isCenter: false,
        }),
      ],
    }));
  };

  const updateMember = (
    key: string,
    field: keyof CreateSongMemberInput,
    value: string | boolean
  ) => {
    setValues((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m._key === key ? { ...m, [field]: value } : m
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.members;
      return next;
    });
  };

  const removeMember = (key: string) => {
    setValues((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m._key !== key),
    }));
  };

  const moveMember = (key: string, direction: "up" | "down") => {
    setValues((prev) => {
      const member = prev.members.find((m) => m._key === key);
      if (!member) return prev;

      // Get indices of members with the same position
      const positionIndices = prev.members
        .map((m, i) => ({ member: m, index: i }))
        .filter((item) => item.member.position === member.position);

      const posIdx = positionIndices.findIndex((item) => item.member._key === key);
      if (posIdx === -1) return prev;

      const swapPosIdx = direction === "up" ? posIdx - 1 : posIdx + 1;
      if (swapPosIdx < 0 || swapPosIdx >= positionIndices.length) return prev;

      const currentGlobalIdx = positionIndices[posIdx].index;
      const swapGlobalIdx = positionIndices[swapPosIdx].index;

      const newMembers = [...prev.members];
      [newMembers[currentGlobalIdx], newMembers[swapGlobalIdx]] = [
        newMembers[swapGlobalIdx],
        newMembers[currentGlobalIdx],
      ];

      return { ...prev, members: newMembers };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await onSubmit(toSubmitValues(values));
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

  // Build available options for a specific member entry (include the currently selected member)
  const getOptionsForMember = (currentMemberId: string) => {
    const filtered = members.filter((member) => {
      if (member.id === currentMemberId) return true;
      if (assignedMemberIds.has(member.id)) return false;
      if (values.groupIds.length === 0) return true;
      return member.groups.some((g) => values.groupIds.includes(g.groupId));
    });
    return filtered.map((m) => ({
      value: m.id,
      label: m.nameJa,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors._form && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errors._form}
        </p>
      )}

      {/* 基本情報 */}
      <Input
        id="title"
        label="タイトル*"
        value={values.title}
        onChange={(e) => update("title", e.target.value)}
        error={errors.title}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="lyricsBy"
          label="作詞"
          value={values.lyricsBy}
          onChange={(e) => update("lyricsBy", e.target.value)}
          error={errors.lyricsBy}
        />
        <Input
          id="musicBy"
          label="作曲"
          value={values.musicBy}
          onChange={(e) => update("musicBy", e.target.value)}
          error={errors.musicBy}
        />
      </div>

      <Input
        id="releaseDate"
        label="リリース日"
        type="date"
        value={values.releaseDate}
        onChange={(e) => update("releaseDate", e.target.value)}
        error={errors.releaseDate}
      />

      {/* グループ選択 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          グループ
        </label>
        {errors.groupIds && (
          <p className="mb-1 text-xs text-red-500">{errors.groupIds}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => toggleGroupId(group.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                values.groupIds.includes(group.id)
                  ? "text-white"
                  : "border border-foreground/10 text-foreground/60"
              }`}
              style={
                values.groupIds.includes(group.id)
                  ? { backgroundColor: group.color }
                  : undefined
              }
            >
              {group.nameJa}
            </button>
          ))}
        </div>
      </div>

      {/* フォーメーション */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground/70">
          フォーメーション
        </label>
        {errors.members && (
          <p className="text-xs text-red-500">{errors.members}</p>
        )}

        {SONG_POSITIONS.map((position) => {
          const positionMembers = getMembersForPosition(position);
          return (
            <div key={position} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/60">
                  {position}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => addMember(position)}
                >
                  + メンバーを追加
                </Button>
              </div>

              {positionMembers.map((member, posIdx) => (
                <div
                  key={member._key}
                  className="flex items-center gap-2 rounded-lg border border-foreground/10 p-2"
                >
                  <div className="flex-1">
                    <Select
                      id={`member-${member._key}`}
                      label=""
                      placeholder="メンバーを選択"
                      options={getOptionsForMember(member.memberId)}
                      value={member.memberId}
                      onChange={(e) =>
                        updateMember(member._key, "memberId", e.target.value)
                      }
                      error={errors[`members.${values.members.indexOf(member)}.memberId`]}
                    />
                  </div>

                  {position === "フロント" && (
                    <label className="flex shrink-0 items-center gap-1 text-xs text-foreground/60">
                      <input
                        type="checkbox"
                        checked={member.isCenter}
                        onChange={(e) =>
                          updateMember(member._key, "isCenter", e.target.checked)
                        }
                        className="rounded"
                      />
                      センター
                    </label>
                  )}

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveMember(member._key, "up")}
                      disabled={posIdx === 0}
                      className="rounded p-1 text-xs text-foreground/40 hover:bg-foreground/5 hover:text-foreground disabled:opacity-30"
                      aria-label="上へ"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMember(member._key, "down")}
                      disabled={posIdx === positionMembers.length - 1}
                      className="rounded p-1 text-xs text-foreground/40 hover:bg-foreground/5 hover:text-foreground disabled:opacity-30"
                      aria-label="下へ"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMember(member._key)}
                      className="rounded p-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      aria-label="削除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              {positionMembers.length === 0 && (
                <p className="py-2 text-center text-xs text-foreground/30">
                  メンバーが追加されていません
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "保存中..."
          : mode === "create"
            ? "登録する"
            : "更新する"}
      </Button>
    </form>
  );
}
