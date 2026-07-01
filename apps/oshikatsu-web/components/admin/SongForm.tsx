"use client";

import { useEffect, useMemo, useState } from "react";
import type { Group } from "@/types/group";
import type { ReleaseOption } from "@/types/release";
import type { MemberOption } from "@/types/member";
import type { PersonOption, PersonRole } from "@/types/person";
import type {
  CreateSongInput,
  CreateSongCostumeInput,
  CreateSongFormationRowInput,
  CreateSongReleaseLinkInput,
  CreateSongVideoInput,
  SongVideoType,
} from "@/types/song";
import {
  SONG_LABELS,
  SONG_LABEL_LABELS,
  SONG_VIDEO_TYPE_LABELS,
  formatSongVideoTypeLabel,
} from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { RELEASE_TYPE_LABELS } from "@/types/release";
import { formatMemberCountSummary } from "@/lib/memberCountSummary";
import { ensureStaffRolesAction } from "@/app/(authenticated)/admin/staffRolesAction";
import { UnregisteredStaffModal } from "@/components/admin/UnregisteredStaffModal";
import {
  findUnregisteredStaff,
  dedupeUnregisteredStaff,
  type UnregisteredStaff,
} from "@/lib/staffRoles";
import { validateSong } from "@/usecases/validateSong";
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
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";

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
  releases: ReleaseOption[];
  members: MemberOption[];
  people: PersonOption[];
  onSubmit: (
    values: CreateSongInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

// 制作陣フィールドと担当(role)の対応。編曲は作曲(music)を共用する。
const CREDIT_FIELDS = [
  { key: "lyricsPeople", label: "作詞", role: "lyrics" },
  { key: "musicPeople", label: "作曲", role: "music" },
  { key: "arrangementPeople", label: "編曲", role: "music" },
  { key: "choreographyPeople", label: "振付", role: "choreography" },
] as const;

type CreditFieldKey = (typeof CREDIT_FIELDS)[number]["key"];

// 担当(role)を持つ人物の表示名のみを候補に返す
function peopleNamesForRole(
  people: PersonOption[],
  role: PersonRole
): string[] {
  return people
    .filter((person) => person.roles.includes(role))
    .map((person) => person.displayName);
}

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

function createEmptyVideoInput(): CreateSongVideoInput {
  return {
    url: "",
    publishedOn: "",
    memo: "",
  };
}

function createEmptyVideos(): Record<SongVideoType, CreateSongVideoInput> {
  return {
    dance_practice: createEmptyVideoInput(),
    call: createEmptyVideoInput(),
  };
}

function getDefaultValues(): FormValues {
  return {
    title: "",
    groupId: "",
    label: "",
    generation: "",
    releaseLinks: [withReleaseKey({ releaseId: "", trackNumber: "" })],
    lyricsPeople: "",
    musicPeople: "",
    arrangementPeople: "",
    choreographyPeople: "",
    formationRows: [],
    centerMemberIds: [],
    mv: {
      url: "",
      directorName: "",
      location: "",
      publishedOn: "",
      memo: "",
    },
    videos: createEmptyVideos(),
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

function normalizeVideosForGroup(
  videos: Record<SongVideoType, CreateSongVideoInput>,
  groupNameJa: string
): Record<SongVideoType, CreateSongVideoInput> {
  return {
    dance_practice: formatSongVideoTypeLabel("dance_practice", groupNameJa)
      ? videos.dance_practice
      : createEmptyVideoInput(),
    call: videos.call,
  };
}

function toSubmitValues(values: FormValues, groupNameJa: string): CreateSongInput {
  return {
    title: values.title,
    groupId: values.groupId,
    label: values.label,
    generation: values.label === "generation" ? values.generation : "",
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
    centerMemberIds: values.centerMemberIds,
    mv: values.mv,
    videos: normalizeVideosForGroup(values.videos, groupNameJa),
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

function hasVideoValue(video: CreateSongVideoInput): boolean {
  return Boolean(
    video.url.trim() ||
      video.publishedOn.trim() ||
      video.memo.trim()
  );
}

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
      className="flex cursor-grab touch-none items-center gap-1 rounded-full border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs text-foreground active:cursor-grabbing"
    >
      <span aria-hidden className="text-foreground/30">
        ⠿
      </span>
      <span className="text-foreground/40">{index + 1}.</span>
      <span>{name}</span>
    </li>
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
  const [unregisteredStaff, setUnregisteredStaff] = useState<UnregisteredStaff[]>(
    []
  );
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
  const [visibleVideos, setVisibleVideos] = useState<Record<SongVideoType, boolean>>(
    () => ({
      dance_practice: Boolean(
        initialValues && hasVideoValue(initialValues.videos.dance_practice)
      ),
      call: Boolean(initialValues && hasVideoValue(initialValues.videos.call)),
    })
  );
  const [showAllParticipantMembers, setShowAllParticipantMembers] = useState(false);
  // フォーメーション列内の並べ替え用センサー（ポインタ＋キーボード）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const releaseMap = useMemo(
    () => new Map<string, ReleaseOption>(releases.map((release) => [release.id, release])),
    [releases]
  );

  const memberNameById = useMemo(
    () => new Map<string, string>(members.map((member) => [member.id, member.nameJa])),
    [members]
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === values.groupId) ?? null,
    [groups, values.groupId]
  );
  const selectedGroupNameJa = selectedGroup?.nameJa ?? "";
  const dancePracticeVideoLabel = formatSongVideoTypeLabel(
    "dance_practice",
    selectedGroupNameJa
  );

  const memberGroupIdsById = useMemo(
    () =>
      new Map<string, Set<string>>(
        members.map((member) => [
          member.id,
          new Set(member.groupIds),
        ])
      ),
    [members]
  );

  const participantOptions = useMemo(() => {
    const options = new Map<string, { name: string; kana: string }>();

    for (const link of values.releaseLinks) {
      if (!link.releaseId) continue;
      const release = releaseMap.get(link.releaseId);
      if (!release) continue;

      for (let i = 0; i < release.participantMemberIds.length; i++) {
        const memberId = release.participantMemberIds[i];
        const name = release.participantMemberNames[i] ?? memberNameById.get(memberId) ?? "";
        const kana = release.participantMemberKanas[i] ?? "";
        options.set(memberId, { name: name || memberId, kana });
      }
    }

    return Array.from(options.entries())
      .map(([memberId, { name, kana }]) => ({
        memberId,
        memberName: name,
        memberKana: kana,
        isInSongGroup:
          values.groupId.length > 0
            ? (memberGroupIdsById.get(memberId)?.has(values.groupId) ?? false)
            : true,
      }))
      // メンバー一覧/リリースと同じく、かな読み順で安定ソートする
      .sort((a, b) => {
        const kanaCompare = a.memberKana.localeCompare(b.memberKana, "ja");
        return kanaCompare !== 0
          ? kanaCompare
          : a.memberName.localeCompare(b.memberName, "ja");
      });
  }, [memberGroupIdsById, memberNameById, releaseMap, values.groupId, values.releaseLinks]);

  const participantNameById = useMemo(
    () =>
      new Map(participantOptions.map((option) => [option.memberId, option.memberName])),
    [participantOptions]
  );

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

  // 1列目(最前列)に居なくなったメンバーはセンター指定から外す
  useEffect(() => {
    setValues((prev) => {
      const frontRow = prev.formationRows[0];
      const allowed = new Set(frontRow ? frontRow.memberIds : []);
      const filtered = prev.centerMemberIds.filter((memberId) =>
        allowed.has(memberId)
      );
      if (filtered.length === prev.centerMemberIds.length) return prev;
      return { ...prev, centerMemberIds: filtered };
    });
  }, [values.formationRows]);

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

  // 期の候補はグループの maxGeneration から 1..max（メンバー登録と同じ供給源）
  const generationOptions = useMemo(() => {
    const max = selectedGroup?.maxGeneration ?? 0;
    return Array.from({ length: max }, (_, i) => String(i + 1));
  }, [selectedGroup]);

  const updateLabel = (label: string) => {
    setValues((prev) => ({
      ...prev,
      label,
      generation: label === "generation" ? prev.generation : "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.label;
      delete next.generation;
      return next;
    });
  };

  // グループ変更で期の候補が変わるため、期はクリアする
  const updateGroupId = (groupId: string) => {
    setValues((prev) => ({ ...prev, groupId, generation: "" }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.groupId;
      delete next.generation;
      return next;
    });
  };

  const addReleaseLink = () => {
    const nextReleaseLink = withReleaseKey({
      releaseId: "",
      // 既定は空欄（保存時にそのリリースの末尾へ自動採番）
      trackNumber: "",
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

  // センター（1列目・最大2人）の指定を切り替える
  const toggleCenter = (memberId: string) => {
    setValues((prev) => {
      if (prev.centerMemberIds.includes(memberId)) {
        return {
          ...prev,
          centerMemberIds: prev.centerMemberIds.filter((id) => id !== memberId),
        };
      }
      if (prev.centerMemberIds.length >= 2) return prev;
      return { ...prev, centerMemberIds: [...prev.centerMemberIds, memberId] };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.centerMemberIds;
      return next;
    });
  };

  // 列内のメンバー順（= slot_order = 左→右）をドラッグ&ドロップで入れ替える
  const handleFormationDragEnd =
    (key: string) =>
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      setValues((prev) => ({
        ...prev,
        formationRows: prev.formationRows.map((row) => {
          if (row._key !== key) return row;
          const oldIndex = row.memberIds.indexOf(String(active.id));
          const newIndex = row.memberIds.indexOf(String(over.id));
          if (oldIndex === -1 || newIndex === -1) return row;
          return {
            ...row,
            memberIds: arrayMove(row.memberIds, oldIndex, newIndex),
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

  const setVideoFormVisible = (type: SongVideoType, isVisible: boolean) => {
    setVisibleVideos((prev) => ({ ...prev, [type]: isVisible }));
  };

  const updateVideo = (
    type: SongVideoType,
    field: keyof CreateSongVideoInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      videos: {
        ...prev.videos,
        [type]: {
          ...prev.videos[type],
          [field]: value,
        },
      },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`videos.${type}.${field}`];
      return next;
    });
  };

  const clearVideo = (type: SongVideoType) => {
    setValues((prev) => ({
      ...prev,
      videos: {
        ...prev.videos,
        [type]: createEmptyVideoInput(),
      },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`videos.${type}.url`];
      delete next[`videos.${type}.publishedOn`];
      delete next[`videos.${type}.memo`];
      return next;
    });
    setVideoFormVisible(type, false);
  };

  // 各制作陣フィールドで、担当(role)の候補に無い名前を未登録として集める
  const collectUnregisteredStaff = (): UnregisteredStaff[] => {
    const entries: UnregisteredStaff[] = [];
    for (const { key, role } of CREDIT_FIELDS) {
      entries.push(
        ...findUnregisteredStaff(people, role, splitPeople(values[key]))
      );
    }
    entries.push(
      ...findUnregisteredStaff(people, "mv_director", [values.mv.directorName])
    );
    entries.push(
      ...findUnregisteredStaff(
        people,
        "costume",
        values.costumes.map((costume) => costume.stylistName)
      )
    );
    return dedupeUnregisteredStaff(entries);
  };

  const applyValidationErrors = (validationErrors: ValidationError[]) => {
    const errorMap: Record<string, string> = {};
    for (const err of validationErrors) {
      errorMap[err.field] = err.message;
    }
    setErrors(errorMap);
  };

  const proceedSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await onSubmit(toSubmitValues(values, selectedGroupNameJa));
      if (result.errors) {
        applyValidationErrors(result.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitValues = toSubmitValues(values, selectedGroupNameJa);
    // 本体バリデーションを先に通す（制作陣マスタだけが更新される状態を避ける）
    const validationErrors = validateSong(submitValues);
    if (validationErrors.length > 0) {
      applyValidationErrors(validationErrors);
      return;
    }
    const unregistered = collectUnregisteredStaff();
    if (unregistered.length > 0) {
      setUnregisteredStaff(unregistered);
      return;
    }
    await proceedSubmit();
  };

  const handleConfirmUnregistered = async () => {
    setIsSubmitting(true);
    try {
      await ensureStaffRolesAction(
        unregisteredStaff.map((entry) => ({
          displayName: entry.displayName,
          role: entry.role,
        }))
      );
    } catch {
      setErrors((prev) => ({
        ...prev,
        _form: "制作陣の追加に失敗しました。時間をおいて再度お試しください",
      }));
      setIsSubmitting(false);
      return;
    }
    setUnregisteredStaff([]);
    setIsSubmitting(false);
    await proceedSubmit();
  };

  const renderVideoForm = (type: SongVideoType, label: string) => {
    const video = values.videos[type];
    const isVisible = visibleVideos[type];

    return (
      <div key={type}>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">{label}</label>
          {!isVisible ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVideoFormVisible(type, true)}
            >
              + {label}を追加
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => clearVideo(type)}>
              {label}を削除
            </Button>
          )}
        </div>

        {isVisible ? (
          <div className="space-y-3 rounded-lg border border-foreground/10 p-4">
            <Input
              id={`song-video-${type}-url`}
              label={`${label}リンク`}
              value={video.url}
              onChange={(e) => updateVideo(type, "url", e.target.value)}
              error={errors[`videos.${type}.url`]}
            />
            <Input
              id={`song-video-${type}-published-on`}
              label="配信日"
              type="date"
              value={video.publishedOn}
              onChange={(e) => updateVideo(type, "publishedOn", e.target.value)}
              error={errors[`videos.${type}.publishedOn`]}
            />
            <Textarea
              id={`song-video-${type}-memo`}
              label={`${label}メモ`}
              value={video.memo}
              onChange={(e) => updateVideo(type, "memo", e.target.value)}
              error={errors[`videos.${type}.memo`]}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
            {label}は未設定です
          </p>
        )}
      </div>
    );
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
          onChange={(e) => updateGroupId(e.target.value)}
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

      <div>
        <label htmlFor="label" className="mb-1 block text-sm font-medium text-foreground/70">
          ラベル
        </label>
        <select
          id="label"
          value={values.label}
          onChange={(e) => updateLabel(e.target.value)}
          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
        >
          <option value="">なし</option>
          {SONG_LABELS.map((label) => (
            <option key={label} value={label}>
              {SONG_LABEL_LABELS[label]}
            </option>
          ))}
        </select>
        {errors.label && (
          <p className="mt-1 text-xs text-red-500">{errors.label}</p>
        )}
      </div>

      {values.label === "generation" && (
        <div>
          <label htmlFor="generation" className="mb-1 block text-sm font-medium text-foreground/70">
            期
          </label>
          <select
            id="generation"
            value={values.generation}
            onChange={(e) => update("generation", e.target.value)}
            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
          >
            <option value="">選択してください</option>
            {generationOptions.map((g) => (
              <option key={g} value={g}>
                {g}期
              </option>
            ))}
          </select>
          {!values.groupId && (
            <p className="mt-1 text-xs text-foreground/40">
              先にグループを選択すると期の候補が表示されます
            </p>
          )}
          {errors.generation && (
            <p className="mt-1 text-xs text-red-500">{errors.generation}</p>
          )}
        </div>
      )}

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
                    placeholder="空欄で末尾"
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
                    参加メンバー{" "}
                    {formatMemberCountSummary(
                      selectedRelease.participantMemberGenerations
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {CREDIT_FIELDS.map(({ key, label, role }) => {
          const selectedPeople = splitPeople(values[key]);
          const query = creditQueries[key];
          const suggestions = peopleNamesForRole(people, role)
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

                {row.memberIds.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-foreground/60">
                      並び順（ドラッグ/キーボードで左→右を調整）
                    </p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleFormationDragEnd(row._key)}
                    >
                      <SortableContext
                        items={row.memberIds}
                        strategy={rectSortingStrategy}
                      >
                        <ul className="flex flex-wrap gap-1.5">
                          {row.memberIds.map((memberId, slotIndex) => (
                            <SortableMemberChip
                              key={memberId}
                              id={memberId}
                              index={slotIndex}
                              name={participantNameById.get(memberId) ?? memberId}
                            />
                          ))}
                        </ul>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                {index === 0 && row.memberIds.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-foreground/60">
                      センター（1列目・最大2人）
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {row.memberIds.map((memberId) => {
                        const isCenter = values.centerMemberIds.includes(memberId);
                        const disabled =
                          !isCenter && values.centerMemberIds.length >= 2;
                        return (
                          <button
                            type="button"
                            key={memberId}
                            onClick={() => toggleCenter(memberId)}
                            disabled={disabled}
                            className={`rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              isCenter
                                ? "border-amber-400 bg-amber-100 text-amber-700"
                                : "border-foreground/10 bg-background text-foreground hover:bg-foreground/5"
                            }`}
                          >
                            {isCenter ? "★ " : ""}
                            {participantNameById.get(memberId) ?? memberId}
                          </button>
                        );
                      })}
                    </div>
                    {errors.centerMemberIds && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.centerMemberIds}
                      </p>
                    )}
                  </div>
                )}
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
                list="person-suggestions-mv_director"
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

      <div className="space-y-4">
        {dancePracticeVideoLabel &&
          renderVideoForm("dance_practice", dancePracticeVideoLabel)}
        {renderVideoForm("call", SONG_VIDEO_TYPE_LABELS.call)}
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
                  list="person-suggestions-costume"
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

      <datalist id="person-suggestions-mv_director">
        {peopleNamesForRole(people, "mv_director").map((personName) => (
          <option key={personName} value={personName} />
        ))}
      </datalist>
      <datalist id="person-suggestions-costume">
        {peopleNamesForRole(people, "costume").map((personName) => (
          <option key={personName} value={personName} />
        ))}
      </datalist>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>

      <UnregisteredStaffModal
        entries={unregisteredStaff}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmUnregistered}
        onCancel={() => setUnregisteredStaff([])}
      />
    </form>
  );
}
