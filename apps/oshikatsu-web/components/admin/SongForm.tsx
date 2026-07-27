"use client";

import { useMemo, useState } from "react";
import type { Group } from "@/types/group";
import type { ReleaseOption } from "@/types/release";
import type { MemberOption } from "@/types/member";
import type { PersonOption } from "@/types/person";
import type {
  CreateSongInput,
  CreateSongCostumeInput,
  CreateSongMvInput,
  CreateSongReleaseLinkInput,
  CreateSongVideoInput,
  SongVideoType,
} from "@/types/song";
import { formatSongVideoTypeLabel } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { ensureStaffRolesAction } from "@/app/(authenticated)/admin/staffRolesAction";
import { UnregisteredStaffModal } from "@/components/admin/UnregisteredStaffModal";
import {
  findUnregisteredStaff,
  dedupeUnregisteredStaff,
  type UnregisteredStaff,
} from "@/lib/staffRoles";
import { validateSong } from "@/usecases/validateSong";
import { pickFirstDatedRelease } from "@/lib/firstRelease";
import { compareByGenerationThenName } from "@/lib/memberOrder";
import { formatMemberCountSummary } from "@/lib/memberCountSummary";
import {
  buildParticipantChoices,
  selectedGenerationsForSummary,
} from "@/lib/songParticipantChoices";
import { addKeyedItem, removeKeyedItem, updateKeyedItem } from "@/lib/keyedList";
import { toErrorMap, useAdminForm } from "@/hooks/useAdminForm";
import {
  CREDIT_FIELDS,
  joinPeople,
  parseMemberCount,
  peopleNamesForRole,
  splitPeople,
  type CreditFieldKey,
  type FormCostume,
  type FormReleaseLink,
  type ParticipantOption,
} from "@/components/admin/song/songFormShared";
import {
  createEmptyVideoInput,
  getDefaultValues,
  hasMvValue,
  hasVideoValue,
  toFormValues,
  toSubmitValues,
  withCostumeKey,
  withFormationRowKey,
  withReleaseKey,
  type FormValues,
} from "@/components/admin/song/songFormValues";
import { SongBasicInfoSection } from "@/components/admin/song/SongBasicInfoSection";
import { SongReleaseLinksSection } from "@/components/admin/song/SongReleaseLinksSection";
import { SongCreditsSection } from "@/components/admin/song/SongCreditsSection";
import { SongParticipantsSection } from "@/components/admin/song/SongParticipantsSection";
import { SongFormationSection } from "@/components/admin/song/SongFormationSection";
import { SongMvSection } from "@/components/admin/song/SongMvSection";
import { SongVideosSection } from "@/components/admin/song/SongVideosSection";
import { SongCostumesSection } from "@/components/admin/song/SongCostumesSection";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

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

export function SongForm({
  mode,
  initialValues,
  groups,
  releases,
  members,
  people,
  onSubmit,
}: SongFormProps) {
  const { values, setValues, update, errors, setErrors, isSubmitting, setIsSubmitting } =
    useAdminForm<FormValues>({
      initialValues: () => (initialValues ? toFormValues(initialValues) : getDefaultValues()),
      // SongForm は未登録スタッフ確認モーダルによる中断・再開を含む独自の handleSubmit を持つため、
      // hook の handleSubmit は使わない（state 基盤のみ利用する）。
    });
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
  const [showAllParticipantMembers, setShowAllParticipantMembers] = useState(false);
  const [visibleVideos, setVisibleVideos] = useState<Record<SongVideoType, boolean>>(
    () => ({
      dance_practice: Boolean(
        initialValues && hasVideoValue(initialValues.videos.dance_practice)
      ),
      call: Boolean(initialValues && hasVideoValue(initialValues.videos.call)),
    })
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
  // 選択中グループが「その他」受け皿グループかどうか（#264）。
  // catch-all のときは通常楽曲固有の項目（リリース・クレジット等）を非表示にし、
  // 代わりに誰の歌か（artistName）・メモ（note）を表示する。
  const isCatchallGroup = selectedGroup?.isCatchall ?? false;
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

  // 楽曲参加メンバーの候補は初出リリースの参加メンバーに限る（#427 / ADR 0007 追記 2026-07-26）。
  // アルバム・再録など後続リリースを紐づけても候補は広がらない。
  // 日付付きの紐づきリリースが無ければ未確定として候補を出さない（フォールバックしない）。
  const firstRelease = useMemo(() => {
    const linkedReleases = values.releaseLinks
      .map((link) => (link.releaseId ? releaseMap.get(link.releaseId) : undefined))
      .filter((release): release is ReleaseOption => Boolean(release));

    return pickFirstDatedRelease(
      linkedReleases.map((release) => ({
        releaseId: release.id,
        releaseDate: release.releaseDate,
        release,
      }))
    )?.release ?? null;
  }, [releaseMap, values.releaseLinks]);

  const participantOptions = useMemo<ParticipantOption[]>(() => {
    const options = new Map<
      string,
      { name: string; kana: string; generation: string | null }
    >();

    if (firstRelease) {
      for (let i = 0; i < firstRelease.participantMemberIds.length; i++) {
        const memberId = firstRelease.participantMemberIds[i];
        const name =
          firstRelease.participantMemberNames[i] ?? memberNameById.get(memberId) ?? "";
        const kana = firstRelease.participantMemberKanas[i] ?? "";
        const generation = firstRelease.participantMemberGenerations[i] ?? null;
        options.set(memberId, { name: name || memberId, kana, generation });
      }
    }

    return Array.from(options.entries())
      .map(([memberId, { name, kana, generation }]) => ({
        memberId,
        memberName: name,
        memberKana: kana,
        generation,
        isInSongGroup:
          values.groupId.length > 0
            ? (memberGroupIdsById.get(memberId)?.has(values.groupId) ?? false)
            : true,
      }))
      // リリース詳細・楽曲詳細と同じ「期昇順 → かな順」で揃える
      .sort((a, b) =>
        compareByGenerationThenName(
          { generation: a.generation, nameKana: a.memberKana },
          { generation: b.generation, nameKana: b.memberKana }
        )
      );
  }, [firstRelease, memberGroupIdsById, memberNameById, values.groupId]);

  // 表示名は候補（初出リリース参加者）に無い選択済みメンバーも解決できるようにする。
  // リリース紐づけ変更で候補外になっても、名前を出して外す判断を促すため（#427）。
  const participantNameById = useMemo(() => {
    const names = new Map(memberNameById);
    for (const option of participantOptions) {
      names.set(option.memberId, option.memberName);
    }
    return names;
  }, [memberNameById, participantOptions]);

  // 現候補（初出リリース参加者）と候補外の既選択を1つの表示モデルへ統合する。
  // 候補外を一覧へ出さないと解除できず、保存境界で拒否されて詰むため（#427）。
  const participantChoices = useMemo(
    () =>
      buildParticipantChoices({
        options: participantOptions,
        selectedMemberIds: values.participantMemberIds,
        nameById: participantNameById,
        showAllGroups: showAllParticipantMembers,
      }),
    [
      participantNameById,
      participantOptions,
      showAllParticipantMembers,
      values.participantMemberIds,
    ]
  );

  // 人数内訳は候補外の既選択も母数に含め、一覧のチェック数と食い違わせない。
  const selectedParticipantSummary = useMemo(
    () => formatMemberCountSummary(selectedGenerationsForSummary(participantChoices)),
    [participantChoices]
  );

  // フォーメーションへ割り当てられるのは楽曲参加メンバーだけ（#427）
  const assignableMembers = useMemo(
    () =>
      values.participantMemberIds.map((memberId) => ({
        memberId,
        memberName: participantNameById.get(memberId) ?? memberId,
      })),
    [participantNameById, values.participantMemberIds]
  );

  const unplacedMemberNames = useMemo(() => {
    const assigned = new Set(values.formationRows.flatMap((row) => row.memberIds));
    return values.participantMemberIds
      .filter((memberId) => !assigned.has(memberId))
      .map((memberId) => participantNameById.get(memberId) ?? memberId);
  }, [participantNameById, values.formationRows, values.participantMemberIds]);

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
      releaseLinks: addKeyedItem(prev.releaseLinks, nextReleaseLink),
    }));
  };

  const updateReleaseLink = (
    key: string,
    field: keyof CreateSongReleaseLinkInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      releaseLinks: updateKeyedItem(prev.releaseLinks, (link) => link._key, key, {
        [field]: value,
      } as Partial<FormReleaseLink>),
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
      releaseLinks: removeKeyedItem(prev.releaseLinks, (link) => link._key, key),
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
      formationRows: addKeyedItem(
        prev.formationRows,
        withFormationRowKey({ memberCount: "0", memberIds: [] })
      ),
    }));
  };

  const updateFormationRowCount = (key: string, memberCount: string) => {
    setValues((prev) => ({
      ...prev,
      formationRows: updateKeyedItem(prev.formationRows, (row) => row._key, key, (row) => {
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
      formationRows: updateKeyedItem(prev.formationRows, (row) => row._key, key, (row) => {
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

  // 楽曲参加メンバーの選択を切り替える（#427）。
  // 外す場合は、そのメンバーをセンターとフォーメーションからも同じ state 更新で外す。
  // 別々の effect に分けると、一瞬だけ不整合な状態が描画されるため1回でまとめる。
  const toggleParticipant = (memberId: string) => {
    setValues((prev) => {
      if (!prev.participantMemberIds.includes(memberId)) {
        return {
          ...prev,
          participantMemberIds: [...prev.participantMemberIds, memberId],
        };
      }

      return {
        ...prev,
        participantMemberIds: prev.participantMemberIds.filter((id) => id !== memberId),
        centerMemberIds: prev.centerMemberIds.filter((id) => id !== memberId),
        formationRows: prev.formationRows.map((row) => ({
          ...row,
          memberIds: row.memberIds.filter((id) => id !== memberId),
        })),
      };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.participantMemberIds;
      delete next.centerMemberIds;
      delete next.formationRows;
      return next;
    });
  };

  // センター（参加メンバー内・最大2人）の指定を切り替える。
  // フォーメーションがある場合の「1列目に含まれる」制約は保存時の検証で扱う（#427）。
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
        formationRows: updateKeyedItem(prev.formationRows, (row) => row._key, key, (row) => {
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
      formationRows: removeKeyedItem(prev.formationRows, (row) => row._key, key),
    }));
  };

  const addCostume = () => {
    setValues((prev) => ({
      ...prev,
      costumes: addKeyedItem(
        prev.costumes,
        withCostumeKey({ stylistName: "", imagePath: "", note: "" })
      ),
    }));
  };

  const updateCostume = (
    key: string,
    field: keyof CreateSongCostumeInput,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      costumes: updateKeyedItem(prev.costumes, (costume) => costume._key, key, {
        [field]: value,
      } as Partial<FormCostume>),
    }));
  };

  const removeCostume = (key: string) => {
    setValues((prev) => ({
      ...prev,
      costumes: removeKeyedItem(prev.costumes, (costume) => costume._key, key),
    }));
  };

  const updateMvField = (field: keyof CreateSongMvInput, value: string) => {
    update("mv", { ...values.mv, [field]: value });
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

  const proceedSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await onSubmit(
        toSubmitValues(values, selectedGroupNameJa, isCatchallGroup)
      );
      if (result.errors) {
        setErrors(toErrorMap(result.errors));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitValues = toSubmitValues(values, selectedGroupNameJa, isCatchallGroup);
    // 本体バリデーションを先に通す（制作陣マスタだけが更新される状態を避ける）
    const validationErrors = validateSong(submitValues, isCatchallGroup);
    if (validationErrors.length > 0) {
      setErrors(toErrorMap(validationErrors));
      return;
    }
    // catch-all（その他）楽曲は制作陣・MV監督・衣装欄自体を表示しないため、
    // 未登録スタッフ確認をスキップする
    const unregistered = isCatchallGroup ? [] : collectUnregisteredStaff();
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormErrorBanner message={errors._form} />

      <SongBasicInfoSection
        title={values.title}
        groupId={values.groupId}
        label={values.label}
        generation={values.generation}
        groups={groups}
        generationOptions={generationOptions}
        errors={errors}
        isCatchallGroup={isCatchallGroup}
        onTitleChange={(value) => update("title", value)}
        onGroupIdChange={updateGroupId}
        onLabelChange={updateLabel}
        onGenerationChange={(value) => update("generation", value)}
      />

      {isCatchallGroup && (
        <>
          <Input
            id="artistName"
            label="誰の歌か（アーティスト名）"
            value={values.artistName}
            onChange={(e) => update("artistName", e.target.value)}
            error={errors.artistName}
          />
          <Textarea
            id="note"
            label="メモ"
            value={values.note}
            onChange={(e) => update("note", e.target.value)}
            error={errors.note}
          />
        </>
      )}

      {!isCatchallGroup && (
        <>
          <SongReleaseLinksSection
            releaseLinks={values.releaseLinks}
            releases={releases}
            releaseMap={releaseMap}
            releaseQueries={releaseQueries}
            errors={errors}
            addReleaseLink={addReleaseLink}
            updateReleaseLink={updateReleaseLink}
            removeReleaseLink={removeReleaseLink}
            updateReleaseQuery={updateReleaseQuery}
          />

          <SongCreditsSection
            values={values}
            creditQueries={creditQueries}
            setCreditQueries={setCreditQueries}
            people={people}
            errors={errors}
            addCreditPerson={addCreditPerson}
            removeCreditPerson={removeCreditPerson}
          />

          {/* 参加メンバー → センター → フォーメーションの順で段階的に登録する（#427） */}
          <SongParticipantsSection
            centerMemberIds={values.centerMemberIds}
            errors={errors}
            choices={participantChoices}
            selectedParticipantSummary={selectedParticipantSummary}
            isFirstReleaseResolved={firstRelease !== null}
            hasCandidate={participantOptions.length > 0}
            participantNameById={participantNameById}
            showAllParticipantMembers={showAllParticipantMembers}
            setShowAllParticipantMembers={setShowAllParticipantMembers}
            toggleParticipant={toggleParticipant}
            toggleCenter={toggleCenter}
          />

          <SongFormationSection
            formationRows={values.formationRows}
            errors={errors}
            assignableMembers={assignableMembers}
            unplacedMemberNames={unplacedMemberNames}
            participantNameById={participantNameById}
            addFormationRow={addFormationRow}
            removeFormationRow={removeFormationRow}
            updateFormationRowCount={updateFormationRowCount}
            toggleFormationMember={toggleFormationMember}
            handleFormationDragEnd={handleFormationDragEnd}
          />

          <SongMvSection
            mv={values.mv}
            errors={errors}
            isMvFormVisible={isMvFormVisible}
            onShow={() => setIsMvFormVisible(true)}
            onClear={clearMv}
            onChangeField={updateMvField}
          />

          <SongVideosSection
            videos={values.videos}
            visibleVideos={visibleVideos}
            dancePracticeVideoLabel={dancePracticeVideoLabel}
            errors={errors}
            setVideoFormVisible={setVideoFormVisible}
            updateVideo={updateVideo}
            clearVideo={clearVideo}
          />

          <SongCostumesSection
            costumes={values.costumes}
            errors={errors}
            addCostume={addCostume}
            updateCostume={updateCostume}
            removeCostume={removeCostume}
          />
        </>
      )}

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
