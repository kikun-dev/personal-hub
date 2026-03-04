"use client";

import { useState } from "react";
import type { Group } from "@/types/group";
import type { EventType } from "@/types/eventType";
import type { MemberWithGroups } from "@/types/member";
import type { CreateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type EventFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateEventInput;
  eventTypes: EventType[];
  groups: Group[];
  members: MemberWithGroups[];
  onSubmit: (
    values: CreateEventInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function getDefaultValues(): CreateEventInput {
  return {
    eventTypeId: "",
    title: "",
    description: "",
    date: "",
    endDate: "",
    startTime: "",
    venue: "",
    url: "",
    groupIds: [],
    memberIds: [],
  };
}

export function EventForm({
  mode,
  initialValues,
  eventTypes,
  groups,
  members,
  onSubmit,
}: EventFormProps) {
  const [values, setValues] = useState<CreateEventInput>(
    () => initialValues ?? getDefaultValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof CreateEventInput>(
    field: K,
    value: CreateEventInput[K]
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

  const toggleMemberId = (memberId: string) => {
    setValues((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter((id) => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

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
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors._form && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errors._form}
        </p>
      )}

      <Input
        id="title"
        label="タイトル*"
        value={values.title}
        onChange={(e) => update("title", e.target.value)}
        error={errors.title}
      />

      <Select
        id="eventTypeId"
        label="イベント種別*"
        placeholder="選択してください"
        options={eventTypes.map((et) => ({
          value: et.id,
          label: et.name,
        }))}
        value={values.eventTypeId}
        onChange={(e) => update("eventTypeId", e.target.value)}
        error={errors.eventTypeId}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="date"
          label="日付*"
          type="date"
          value={values.date}
          onChange={(e) => update("date", e.target.value)}
          error={errors.date}
        />
        <Input
          id="endDate"
          label="終了日"
          type="date"
          value={values.endDate}
          onChange={(e) => update("endDate", e.target.value)}
        />
      </div>

      <Input
        id="startTime"
        label="開始時間"
        type="time"
        value={values.startTime}
        onChange={(e) => update("startTime", e.target.value)}
      />

      <Input
        id="venue"
        label="会場"
        value={values.venue}
        onChange={(e) => update("venue", e.target.value)}
      />

      <Input
        id="url"
        label="URL"
        type="url"
        value={values.url}
        onChange={(e) => update("url", e.target.value)}
      />

      <Textarea
        id="description"
        label="説明"
        value={values.description}
        onChange={(e) => update("description", e.target.value)}
      />

      {/* グループ選択 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          グループ*
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

      {/* メンバー選択（オプション） */}
      {members.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/70">
            関連メンバー（任意）
          </label>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-foreground/10 p-2">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
              >
                <input
                  type="checkbox"
                  checked={values.memberIds.includes(member.id)}
                  onChange={() => toggleMemberId(member.id)}
                  className="rounded"
                />
                <span className="text-foreground">{member.nameJa}</span>
                <span className="text-xs text-foreground/40">
                  {member.groups.map((g) => g.groupNameJa).join(", ")}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

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
