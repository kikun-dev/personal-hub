"use client";

import type { EventOption } from "@/types/event";
import { getSongVideoTypeLabel } from "@/types/song";
import type { SongVideoOption } from "@/types/song";
import {
  SPOT_SOURCE_TYPES,
  SPOT_SOURCE_TYPE_LABELS,
} from "@/types/spot";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { focusRingClass } from "@/components/ui/focusRing";
import type {
  AppearanceField,
  SpotFormMasterData,
} from "@/components/admin/spot/spotFormShared";

const inputClass = `w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 ${focusRingClass}`;

function formatVideoOptionLabel(option: SongVideoOption): string {
  const typeLabel = getSongVideoTypeLabel(option.videoType);
  const publishedLabel = option.publishedOn ? `（${option.publishedOn}）` : "";
  return `${option.trackTitle} / ${typeLabel}${publishedLabel}`;
}

function formatEventOptionLabel(option: EventOption): string {
  return `${option.title}（${option.date}）`;
}

type SpotAppearancesSectionProps = {
  appearances: AppearanceField[];
  masters: SpotFormMasterData;
  errors: Record<string, string>;
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<AppearanceField>) => void;
  onRemove: (key: string) => void;
  onSourceTypeChange: (key: string, sourceType: string) => void;
  onToggleMember: (key: string, memberId: string) => void;
};

export function SpotAppearancesSection({
  appearances,
  masters,
  errors,
  onAdd,
  onUpdate,
  onRemove,
  onSourceTypeChange,
  onToggleMember,
}: SpotAppearancesSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground/70">
          出来事*
        </label>
        <Button type="button" variant="secondary" onClick={onAdd}>
          出来事を追加
        </Button>
      </div>
      {errors.appearances && (
        <p className="text-xs text-red-500">{errors.appearances}</p>
      )}

      {appearances.map((appearance, index) => {
        const fieldError = (field: string) =>
          errors[`appearances[${index}].${field}`];

        return (
          <div
            key={appearance._key}
            className="space-y-3 rounded-lg border border-foreground/10 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/70">
                出来事 {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemove(appearance._key)}
                className="text-sm text-red-500 hover:underline"
              >
                削除
              </button>
            </div>

            <Select
              id={`appearance-${appearance._key}-groupId`}
              label="グループ*"
              placeholder="選択してください"
              options={masters.groups.map((group) => ({
                value: group.id,
                label: group.nameJa,
              }))}
              value={appearance.groupId}
              onChange={(e) =>
                onUpdate(appearance._key, { groupId: e.target.value })
              }
              error={fieldError("groupId")}
            />

            <Select
              id={`appearance-${appearance._key}-sourceType`}
              label="出典種別*"
              placeholder="選択してください"
              options={SPOT_SOURCE_TYPES.map((type) => ({
                value: type,
                label: SPOT_SOURCE_TYPE_LABELS[type],
              }))}
              value={appearance.sourceType}
              onChange={(e) =>
                onSourceTypeChange(appearance._key, e.target.value)
              }
              error={fieldError("sourceType")}
            />

            {appearance.sourceType === "mv" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/70">
                  出典（楽曲）
                </label>
                <Combobox
                  value={appearance.trackId}
                  onChange={(trackId) =>
                    onUpdate(appearance._key, { trackId })
                  }
                  options={masters.songOptions.map((option) => ({
                    value: option.id,
                    label: option.title,
                  }))}
                  ariaLabel="楽曲を検索"
                  placeholder="曲名で検索"
                  emptyLabel="未設定"
                />
                {fieldError("trackId") && (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldError("trackId")}
                  </p>
                )}
              </div>
            )}

            {appearance.sourceType === "video" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/70">
                  出典（関連動画）
                </label>
                <Combobox
                  value={appearance.videoId}
                  onChange={(videoId) =>
                    onUpdate(appearance._key, { videoId })
                  }
                  options={masters.videoOptions.map((option) => ({
                    value: option.id,
                    label: formatVideoOptionLabel(option),
                  }))}
                  ariaLabel="関連動画を検索"
                  placeholder="曲名で検索"
                  emptyLabel="未設定"
                />
                {fieldError("videoId") && (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldError("videoId")}
                  </p>
                )}
              </div>
            )}

            {appearance.sourceType === "event" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/70">
                  出典（イベント）
                </label>
                <Combobox
                  value={appearance.eventId}
                  onChange={(eventId) =>
                    onUpdate(appearance._key, { eventId })
                  }
                  options={masters.eventOptions.map((option) => ({
                    value: option.id,
                    label: formatEventOptionLabel(option),
                  }))}
                  ariaLabel="イベントを検索"
                  placeholder="タイトルで検索"
                  emptyLabel="未設定"
                />
                {fieldError("eventId") && (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldError("eventId")}
                  </p>
                )}
              </div>
            )}

            {appearance.sourceType === "live" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/70">
                  出典（ライブ）
                </label>
                <Combobox
                  value={appearance.liveId}
                  onChange={(liveId) =>
                    onUpdate(appearance._key, { liveId })
                  }
                  options={masters.liveOptions.map((option) => ({
                    value: option.id,
                    label: option.name,
                  }))}
                  ariaLabel="ライブを検索"
                  placeholder="ライブ名で検索"
                  emptyLabel="未設定"
                />
                {fieldError("liveId") && (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldError("liveId")}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor={`appearance-${appearance._key}-subtypeName`}
                className="mb-1 block text-sm font-medium text-foreground/70"
              >
                サブ種別
              </label>
              <input
                id={`appearance-${appearance._key}-subtypeName`}
                list={`appearance-${appearance._key}-subtypeName-options`}
                value={appearance.subtypeName}
                onChange={(e) =>
                  onUpdate(appearance._key, {
                    subtypeName: e.target.value,
                  })
                }
                placeholder="例: あそぶだけ（候補になければ新規入力可）"
                className={inputClass}
              />
              <datalist id={`appearance-${appearance._key}-subtypeName-options`}>
                {masters.subtypeOptions
                  .filter((option) => option.sourceType === appearance.sourceType)
                  .map((option) => (
                    <option key={option.id} value={option.name} />
                  ))}
              </datalist>
              {fieldError("subtypeName") && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldError("subtypeName")}
                </p>
              )}
            </div>

            <Input
              id={`appearance-${appearance._key}-linkUrl`}
              label="リンク"
              value={appearance.linkUrl}
              onChange={(e) =>
                onUpdate(appearance._key, { linkUrl: e.target.value })
              }
              error={fieldError("linkUrl")}
            />

            <Textarea
              id={`appearance-${appearance._key}-note`}
              label="メモ"
              value={appearance.note}
              onChange={(e) =>
                onUpdate(appearance._key, { note: e.target.value })
              }
              error={fieldError("note")}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">
                関連メンバー（任意）
              </label>
              {fieldError("memberIds") && (
                <p className="mb-1 text-xs text-red-500">
                  {fieldError("memberIds")}
                </p>
              )}
              <div className="max-h-48 overflow-y-auto rounded-lg border border-foreground/10 p-2">
                {masters.members.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
                  >
                    <input
                      type="checkbox"
                      checked={appearance.memberIds.includes(member.id)}
                      onChange={() =>
                        onToggleMember(appearance._key, member.id)
                      }
                      className="rounded"
                    />
                    <span className="text-foreground">{member.nameJa}</span>
                    <span className="text-xs text-foreground/40">
                      {member.groupNames.join(", ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
