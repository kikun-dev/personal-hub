"use client";

import { useEffect, useMemo, useState } from "react";
import type { Group } from "@/types/group";
import type { Release } from "@/types/release";
import type { MemberWithGroups } from "@/types/member";
import type {
  CreateSongInput,
  CreateSongCostumeInput,
  CreateSongFormationRowInput,
  CreateSongReleaseLinkInput,
} from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { RELEASE_TYPE_LABELS } from "@/types/release";

type FormReleaseLink = CreateSongReleaseLinkInput & { _key: string };
type FormFormationRow = CreateSongFormationRowInput & { _key: string };
type FormCostume = CreateSongCostumeInput & { _key: string };

type FormValues = Omit<CreateSongInput, "releaseLinks" | "formationRows" | "costumes"> & {
  releaseLinks: FormReleaseLink[];
  formationRows: FormFormationRow[];
  costumes: FormCostume[];
};

type SongFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateSongInput;
  groups: Group[];
  releases: Release[];
  members: MemberWithGroups[];
  people: string[];
  onSubmit: (
    values: CreateSongInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

const CREDIT_FIELDS = [
  { key: "lyricsPeople", label: "作詞" },
  { key: "musicPeople", label: "作曲" },
  { key: "arrangementPeople", label: "編曲" },
  { key: "choreographyPeople", label: "振付" },
] as const;

type CreditFieldKey = (typeof CREDIT_FIELDS)[number]["key"];

function splitPeople(value: string): string[] {
  return value
    .split(",")
    .flatMap((part) => part.split("、"))
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinPeople(people: string[]): string {
  return people.join(", ");
}

function withReleaseKey(link: CreateSongReleaseLinkInput): FormReleaseLink {
  return { ...link, _key: crypto.randomUUID() };
}

function withFormationRowKey(row: CreateSongFormationRowInput): FormFormationRow {
  return { ...row, _key: crypto.randomUUID() };
}

function withCostumeKey(costume: CreateSongCostumeInput): FormCostume {
  return { ...costume, _key: crypto.randomUUID() };
}

function getDefaultValues(): FormValues {
  return {
    title: "",
    groupId: "",
    durationSeconds: "",
    releaseLinks: [withReleaseKey({ releaseId: "", trackNumber: "1" })],
    lyricsPeople: "",
    musicPeople: "",
    arrangementPeople: "",
    choreographyPeople: "",
    formationRows: [],
    mv: {
      url: "",
      directorName: "",
      location: "",
      publishedOn: "",
      memo: "",
    },
    costumes: [],
  };
}

function toFormValues(input: CreateSongInput): FormValues {
  return {
    ...input,
    releaseLinks: input.releaseLinks.map(withReleaseKey),
    formationRows: input.formationRows.map(withFormationRowKey),
    costumes: input.costumes.map(withCostumeKey),
  };
}

function toSubmitValues(values: FormValues): CreateSongInput {
  return {
    title: values.title,
    groupId: values.groupId,
    durationSeconds: values.durationSeconds,
    releaseLinks: values.releaseLinks.map((link) => ({
      releaseId: link.releaseId,
      trackNumber: link.trackNumber,
    })),
    lyricsPeople: values.lyricsPeople,
    musicPeople: values.musicPeople,
    arrangementPeople: values.arrangementPeople,
    choreographyPeople: values.choreographyPeople,
    formationRows: values.formationRows.map((row) => ({
      memberCount: row.memberCount,
      memberIds: row.memberIds,
    })),
    mv: values.mv,
    costumes: values.costumes.map((costume) => ({
      stylistName: costume.stylistName,
      imagePath: costume.imagePath,
      note: costume.note,
    })),
  };
}

function parseMemberCount(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function hasMvValue(mv: CreateSongInput["mv"]): boolean {
  return Boolean(
    mv.url.trim() ||
      mv.directorName.trim() ||
      mv.location.trim() ||
      mv.publishedOn.trim() ||
      mv.memo.trim()
  );
}

export function SongForm({
  mode,
  initialValues,
  groups,
  releases,
  members,
  people,
  onSubmit,
}: SongFormProps) {
  const [values, setValues] = useState<FormValues>(
    () => (initialValues ? toFormValues(initialValues) : getDefaultValues())
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [releaseQueries, setReleaseQueries] = useState<Record<string, string>>({});
  const [creditQueries, setCreditQueries] = useState<Record<CreditFieldKey, string>>({
    lyricsPeople: "",
    musicPeople: "",
    arrangementPeople: "",
    choreographyPeople: "",
  });
  const [isMvFormVisible, setIsMvFormVisible] = useState<boolean>(
    () => Boolean(initialValues && hasMvValue(initialValues.mv))
  );
  const [showAllParticipantMembers, setShowAllParticipantMembers] = useState(false);

  const releaseMap = useMemo(
    () => new Map<string, Release>(releases.map((release) => [release.id, release])),
    [releases]
  );

  const memberNameById = useMemo(
    () => new Map<string, string>(members.map((member) => [member.id, member.nameJa])),
    [members]
  );

  const memberGroupIdsById = useMemo(
    () =>
      new Map<string, Set<string>>(
        members.map((member) => [
          member.id,
          new Set(member.groups.map((memberGroup) => memberGroup.groupId)),
        ])
      ),
    [members]
  );

  const participantOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const link of values.releaseLinks) {
      if (!link.releaseId) continue;
      const release = releaseMap.get(link.releaseId);
      if (!release) continue;

      for (let i = 0; i < release.participantMemberIds.length; i++) {
        const memberId = release.participantMemberIds[i];
        const name = release.participantMemberNames[i] ?? memberNameById.get(memberId) ?? "";
        options.set(memberId, name || memberId);
      }
    }

    return Array.from(options.entries())
      .map(([memberId, memberName]) => ({
        memberId,
        memberName,
        isInSongGroup:
          values.groupId.length > 0
            ? (memberGroupIdsById.get(memberId)?.has(values.groupId) ?? false)
            : true,
      }))
      .sort((a, b) => a.memberName.localeCompare(b.memberName));
  }, [memberGroupIdsById, memberNameById, releaseMap, values.groupId, values.releaseLinks]);

  const selectedFormationMemberIds = useMemo(() => {
    const selected = new Set<string>();
    for (const row of values.formationRows) {
      for (const memberId of row.memberIds) {
        selected.add(memberId);
      }
    }
    return selected;
  }, [values.formationRows]);

  const visibleParticipantOptions = useMemo(() => {
    if (showAllParticipantMembers) {
      return participantOptions;
    }

    return participantOptions.filter((option) =>
      option.isInSongGroup || selectedFormationMemberIds.has(option.memberId)
    );
  }, [participantOptions, selectedFormationMemberIds, showAllParticipantMembers]);

  const outOfGroupSelectedMemberNames = useMemo(
    () =>
      participantOptions
        .filter((option) => selectedFormationMemberIds.has(option.memberId) && !option.isInSongGroup)
        .map((option) => option.memberName),
    [participantOptions, selectedFormationMemberIds]
  );

  useEffect(() => {
    const allowed = new Set(participantOptions.map((option) => option.memberId));

    setValues((prev) => ({
      ...prev,
      formationRows: prev.formationRows.map((row) => ({
        ...row,
        memberIds: row.memberIds.filter((memberId) => allowed.has(memberId)),
      })),
    }));
  }, [participantOptions]);

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

  const addReleaseLink = () => {
    const nextReleaseLink = withReleaseKey({
      releaseId: "",
      trackNumber: String(values.releaseLinks.length + 1),
    });

    setValues((prev) => ({
      ...prev,
      releaseLinks: [...prev.releaseLinks, nextReleaseLink],
    }));
  };

  const updateReleaseLink = (
    key: string,
    field: keyof CreateSongReleaseLinkInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      releaseLinks: prev.releaseLinks.map((link) =>
        link._key === key ? { ...link, [field]: value } : link
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.releaseLinks;
      return next;
    });
  };

  const removeReleaseLink = (key: string) => {
    setValues((prev) => ({
      ...prev,
      releaseLinks: prev.releaseLinks.filter((link) => link._key !== key),
    }));
    setReleaseQueries((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateReleaseQuery = (key: string, query: string) => {
    setReleaseQueries((prev) => ({
      ...prev,
      [key]: query,
    }));
  };

  const addCreditPerson = (field: CreditFieldKey, rawName: string) => {
    const nextName = rawName.trim();
    if (!nextName) return;

    const current = splitPeople(values[field]);
    if (current.includes(nextName)) return;

    update(field, joinPeople([...current, nextName]) as FormValues[CreditFieldKey]);
    setCreditQueries((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const removeCreditPerson = (field: CreditFieldKey, index: number) => {
    const current = splitPeople(values[field]);
    const next = current.filter((_, i) => i !== index);
    update(field, joinPeople(next) as FormValues[CreditFieldKey]);
  };

  const addFormationRow = () => {
    setValues((prev) => ({
      ...prev,
      formationRows: [
        ...prev.formationRows,
        withFormationRowKey({ memberCount: "0", memberIds: [] }),
      ],
    }));
  };

  const updateFormationRowCount = (key: string, memberCount: string) => {
    setValues((prev) => ({
      ...prev,
      formationRows: prev.formationRows.map((row) => {
        if (row._key !== key) return row;

        const nextCount = parseMemberCount(memberCount);
        const nextMembers = row.memberIds.slice(0, nextCount);

        return {
          ...row,
          memberCount,
          memberIds: nextMembers,
        };
      }),
    }));
  };

  const toggleFormationMember = (key: string, memberId: string) => {
    setValues((prev) => ({
      ...prev,
      formationRows: prev.formationRows.map((row) => {
        if (row._key !== key) return row;

        if (row.memberIds.includes(memberId)) {
          return {
            ...row,
            memberIds: row.memberIds.filter((id) => id !== memberId),
          };
        }

        const limit = parseMemberCount(row.memberCount);
        if (row.memberIds.length >= limit) {
          return row;
        }

        return {
          ...row,
          memberIds: [...row.memberIds, memberId],
        };
      }),
    }));
  };

  const removeFormationRow = (key: string) => {
    setValues((prev) => ({
      ...prev,
      formationRows: prev.formationRows.filter((row) => row._key !== key),
    }));
  };

  const addCostume = () => {
    setValues((prev) => ({
      ...prev,
      costumes: [
        ...prev.costumes,
        withCostumeKey({ stylistName: "", imagePath: "", note: "" }),
      ],
    }));
  };

  const updateCostume = (
    key: string,
    field: keyof CreateSongCostumeInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      costumes: prev.costumes.map((costume) =>
        costume._key === key ? { ...costume, [field]: value } : costume
      ),
    }));
  };

  const removeCostume = (key: string) => {
    setValues((prev) => ({
      ...prev,
      costumes: prev.costumes.filter((costume) => costume._key !== key),
    }));
  };

  const clearMv = () => {
    update("mv", {
      url: "",
      directorName: "",
      location: "",
      publishedOn: "",
      memo: "",
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next["mv.url"];
      delete next["mv.directorName"];
      delete next["mv.location"];
      delete next["mv.publishedOn"];
      delete next["mv.memo"];
      return next;
    });
    setIsMvFormVisible(false);
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

      <div>
        <label htmlFor="groupId" className="mb-1 block text-sm font-medium text-foreground/70">
          楽曲グループ*
        </label>
        <select
          id="groupId"
          value={values.groupId}
          onChange={(e) => update("groupId", e.target.value)}
          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
        >
          <option value="">選択してください</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.nameJa}
            </option>
          ))}
        </select>
        {errors.groupId && (
          <p className="mt-1 text-xs text-red-500">{errors.groupId}</p>
        )}
      </div>

      <Input
        id="durationSeconds"
        label="時間（秒）"
        type="number"
        min={1}
        value={values.durationSeconds}
        onChange={(e) => update("durationSeconds", e.target.value)}
        error={errors.durationSeconds}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">紐づけリリース*</label>
          <Button type="button" variant="ghost" onClick={addReleaseLink}>
            + リリースを追加
          </Button>
        </div>
        {errors.releaseLinks && <p className="mb-2 text-xs text-red-500">{errors.releaseLinks}</p>}
        <div className="space-y-2">
          {values.releaseLinks.map((link, index) => {
            const selectedRelease = releaseMap.get(link.releaseId);
            const query = (releaseQueries[link._key] ?? "").trim().toLowerCase();
            const candidates = releases
              .filter((release) => release.title.toLowerCase().includes(query))
              .slice(0, 50);
            const selectableReleases = selectedRelease && !candidates.some((release) => release.id === selectedRelease.id)
              ? [selectedRelease, ...candidates]
              : candidates;

            return (
              <div key={link._key} className="rounded-lg border border-foreground/10 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
                  <Input
                    id={`release-search-${link._key}`}
                    label="タイトル検索"
                    value={releaseQueries[link._key] ?? selectedRelease?.title ?? ""}
                    onChange={(e) => updateReleaseQuery(link._key, e.target.value)}
                  />

                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">リリース</label>
                    <select
                      value={link.releaseId}
                      onChange={(e) => {
                        const nextReleaseId = e.target.value;
                        updateReleaseLink(link._key, "releaseId", nextReleaseId);
                        if (nextReleaseId) {
                          updateReleaseQuery(link._key, releaseMap.get(nextReleaseId)?.title ?? "");
                        }
                      }}
                      className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
                    >
                      <option value="">選択してください</option>
                      {selectableReleases.map((release) => (
                        <option key={release.id} value={release.id}>
                          {release.title} ({RELEASE_TYPE_LABELS[release.releaseType]})
                        </option>
                      ))}
                    </select>
                    {errors[`releaseLinks.${index}.releaseId`] && (
                      <p className="mt-1 text-xs text-red-500">{errors[`releaseLinks.${index}.releaseId`]}</p>
                    )}
                  </div>

                  <Input
                    id={`trackNumber-${link._key}`}
                    label="曲順"
                    type="number"
                    min={1}
                    value={link.trackNumber}
                    onChange={(e) => updateReleaseLink(link._key, "trackNumber", e.target.value)}
                    error={errors[`releaseLinks.${index}.trackNumber`]}
                  />

                  <button
                    type="button"
                    onClick={() => removeReleaseLink(link._key)}
                    className="rounded p-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    削除
                  </button>
                </div>
                {selectedRelease && (
                  <p className="mt-2 text-xs text-foreground/50">
                    参加メンバー {selectedRelease.participantMemberIds.length}人
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {CREDIT_FIELDS.map(({ key, label }) => {
          const selectedPeople = splitPeople(values[key]);
          const query = creditQueries[key];
          const suggestions = people
            .filter((personName) => personName.toLowerCase().includes(query.trim().toLowerCase()))
            .slice(0, 20);

          return (
            <div key={key} className="rounded-lg border border-foreground/10 p-3">
              <label className="block text-sm font-medium text-foreground/70">{label}</label>

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedPeople.map((personName, index) => (
                  <span
                    key={`${key}-${personName}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-xs text-foreground"
                  >
                    {personName}
                    <button
                      type="button"
                      className="text-foreground/60 hover:text-foreground"
                      onClick={() => removeCreditPerson(key, index)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedPeople.length === 0 && (
                  <span className="text-xs text-foreground/40">未設定</span>
                )}
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  id={`${key}-search`}
                  label={`${label}を検索/入力`}
                  list={`${key}-person-suggestions`}
                  value={query}
                  onChange={(e) =>
                    setCreditQueries((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  error={errors[key]}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCreditPerson(key, query);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addCreditPerson(key, query)}
                >
                  追加
                </Button>
              </div>

              <datalist id={`${key}-person-suggestions`}>
                {suggestions.map((personName) => (
                  <option key={`${key}-${personName}`} value={personName} />
                ))}
              </datalist>
            </div>
          );
        })}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">フォーメーション</label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAllParticipantMembers((prev) => !prev)}
            >
              {showAllParticipantMembers ? "同グループのみ表示" : "他グループも表示"}
            </Button>
            <Button type="button" variant="ghost" onClick={addFormationRow}>
              + 列を追加
            </Button>
          </div>
        </div>
        {errors.formationRows && <p className="mb-2 text-xs text-red-500">{errors.formationRows}</p>}
        {participantOptions.length === 0 && values.formationRows.length > 0 && (
          <p className="mb-2 text-xs text-foreground/50">リリースを選択すると参加メンバーを割り当てできます</p>
        )}
        {!showAllParticipantMembers && values.groupId && (
          <p className="mb-2 text-xs text-foreground/50">
            同グループ在籍歴のあるメンバーを優先表示中です
          </p>
        )}
        {outOfGroupSelectedMemberNames.length > 0 && (
          <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            注意: 楽曲グループ外のメンバーが選択されています（
            {outOfGroupSelectedMemberNames.join(" / ")}）
          </p>
        )}
        <div className="space-y-3">
          {values.formationRows.map((row, index) => {
            const memberCount = parseMemberCount(row.memberCount);
            return (
              <div key={row._key} className="rounded-lg border border-foreground/10 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{index + 1}列目</p>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
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
                  <p className="mb-1 text-xs text-foreground/60">
                    参加メンバー割当 ({row.memberIds.length}/{memberCount})
                  </p>
                  {errors[`formationRows.${index}.memberIds`] && (
                    <p className="mb-1 text-xs text-red-500">{errors[`formationRows.${index}.memberIds`]}</p>
                  )}
                  <div className="max-h-40 overflow-y-auto rounded border border-foreground/10 p-2">
                    {visibleParticipantOptions.map((option) => {
                      const checked = row.memberIds.includes(option.memberId);
                      const disabled = !checked && row.memberIds.length >= memberCount;

                      return (
                        <label
                          key={`${row._key}-${option.memberId}`}
                          className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleFormationMember(row._key, option.memberId)}
                          />
                          <span>
                            {option.memberName}
                            {!option.isInSongGroup && (
                              <span className="ml-1 text-xs text-amber-600">(グループ外)</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                    {visibleParticipantOptions.length === 0 && (
                      <p className="text-xs text-foreground/40">選択可能なメンバーがいません</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {values.formationRows.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
              フォーメーションは未設定です
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">MV</label>
          {!isMvFormVisible ? (
            <Button type="button" variant="ghost" onClick={() => setIsMvFormVisible(true)}>
              + MVを追加
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={clearMv}>
              MVを削除
            </Button>
          )}
        </div>

        {isMvFormVisible ? (
          <div className="space-y-3 rounded-lg border border-foreground/10 p-4">
            <Input
              id="mv-url"
              label="MVリンク"
              value={values.mv.url}
              onChange={(e) => update("mv", { ...values.mv, url: e.target.value })}
              error={errors["mv.url"]}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                id="mv-director"
                label="監督"
                list="song-person-suggestions"
                value={values.mv.directorName}
                onChange={(e) => update("mv", { ...values.mv, directorName: e.target.value })}
                error={errors["mv.directorName"]}
              />
              <Input
                id="mv-location"
                label="ロケ地"
                value={values.mv.location}
                onChange={(e) => update("mv", { ...values.mv, location: e.target.value })}
                error={errors["mv.location"]}
              />
              <Input
                id="mv-published-on"
                label="配信日"
                type="date"
                value={values.mv.publishedOn}
                onChange={(e) => update("mv", { ...values.mv, publishedOn: e.target.value })}
                error={errors["mv.publishedOn"]}
              />
            </div>
            <Textarea
              id="mv-memo"
              label="MVメモ"
              value={values.mv.memo}
              onChange={(e) => update("mv", { ...values.mv, memo: e.target.value })}
              error={errors["mv.memo"]}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
            MVは未設定です
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">衣装</label>
          <Button type="button" variant="ghost" onClick={addCostume}>
            + 衣装を追加
          </Button>
        </div>
        <div className="space-y-3">
          {values.costumes.map((costume, index) => (
            <div key={costume._key} className="rounded-lg border border-foreground/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-foreground/50">#{index + 1}</p>
                <button
                  type="button"
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => removeCostume(costume._key)}
                >
                  削除
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  id={`costume-stylist-${costume._key}`}
                  label="衣装担当*"
                  list="song-person-suggestions"
                  value={costume.stylistName}
                  onChange={(e) => updateCostume(costume._key, "stylistName", e.target.value)}
                  error={errors[`costumes.${index}.stylistName`]}
                />
                <Input
                  id={`costume-image-${costume._key}`}
                  label="画像（Storage path: costumes/...）*"
                  value={costume.imagePath}
                  onChange={(e) => updateCostume(costume._key, "imagePath", e.target.value)}
                  error={errors[`costumes.${index}.imagePath`]}
                />
              </div>
              <Textarea
                id={`costume-note-${costume._key}`}
                label="メモ"
                value={costume.note}
                onChange={(e) => updateCostume(costume._key, "note", e.target.value)}
                error={errors[`costumes.${index}.note`]}
              />
            </div>
          ))}
          {values.costumes.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
              衣装は未設定です
            </p>
          )}
        </div>
      </div>

      <datalist id="song-person-suggestions">
        {people.map((personName) => (
          <option key={personName} value={personName} />
        ))}
      </datalist>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
