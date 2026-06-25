"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MemberGrid } from "@/components/members/MemberGrid";
import { MemberSectionList } from "@/components/members/MemberSectionList";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import type { Group } from "@/types/group";
import type { MemberListItem } from "@/types/member";
import {
  filterMembersByGeneration,
  filterMembersByGroup,
  filterMembersByStatus,
  type MemberStatus,
} from "@/usecases/memberFilters";
import { createMemberSections } from "@/usecases/groupListSections";

type MemberBrowserProps = {
  groups: Group[];
  members: MemberListItem[];
};

const STATUS_OPTIONS: { label: string; value: MemberStatus }[] = [
  { label: "全員", value: "all" },
  { label: "現役", value: "active" },
  { label: "卒業", value: "graduated" },
];

function toMemberStatus(value: string | null): MemberStatus {
  // 既定は現役（URL に status が無い場合）
  return value === "all" || value === "graduated" ? value : "active";
}

export function MemberBrowser({ groups, members }: MemberBrowserProps) {
  // 即時反映は local state、戻る/リロード等の URL 変化は useEffect で同期する
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get("groupId") ?? "";
  const urlStatus = toMemberStatus(searchParams.get("status"));
  const urlGeneration = searchParams.get("generation") ?? "";
  const [groupId, setGroupId] = useState(urlGroupId);
  const [status, setStatus] = useState<MemberStatus>(urlStatus);
  const [generation, setGeneration] = useState(urlGeneration);

  useEffect(() => {
    setGroupId(urlGroupId);
  }, [urlGroupId]);
  useEffect(() => {
    setStatus(urlStatus);
  }, [urlStatus]);
  useEffect(() => {
    setGeneration(urlGeneration);
  }, [urlGeneration]);

  const isGroupFiltered = groupId !== "";

  // 期の選択肢：選択グループの maxGeneration（無ければ所属メンバーの実在世代から導出）
  const generationOptions = useMemo(() => {
    if (!isGroupFiltered) {
      return [];
    }
    const selectedGroup = groups.find((group) => group.id === groupId) ?? null;
    const maxGeneration = selectedGroup?.maxGeneration ?? null;
    if (maxGeneration && maxGeneration > 0) {
      return Array.from({ length: maxGeneration }, (_, index) =>
        String(index + 1)
      );
    }
    const present = new Set<string>();
    members.forEach((member) =>
      member.groups.forEach((group) => {
        if (group.groupId === groupId && group.generation) {
          present.add(group.generation);
        }
      })
    );
    return [...present].sort((a, b) => Number(a) - Number(b));
  }, [isGroupFiltered, groups, groupId, members]);

  // ステータスで先に絞り込んだ母集合
  const baseMembers = useMemo(
    () => filterMembersByStatus(members, status),
    [members, status]
  );

  // 件数表示・フラット表示用（グループ＋期も適用）
  const flatMembers = useMemo(
    () =>
      filterMembersByGeneration(
        filterMembersByGroup(baseMembers, groupId),
        groupId,
        generation
      ),
    [baseMembers, groupId, generation]
  );
  // セクション表示はグループ未選択時のみ使う
  const memberSections = useMemo(
    () => (isGroupFiltered ? [] : createMemberSections(baseMembers, groups)),
    [isGroupFiltered, baseMembers, groups]
  );

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    // 期はグループ依存のため、グループ変更時はリセット
    setGeneration("");
    replaceListFilterParams({ groupId: nextGroupId, generation: "" });
  };

  const handleGenerationChange = (nextGeneration: string) => {
    setGeneration(nextGeneration);
    replaceListFilterParams({ generation: nextGeneration });
  };

  const handleStatusChange = (nextStatus: MemberStatus) => {
    setStatus(nextStatus);
    // 既定（現役）に戻す場合は URL から status を外す
    replaceListFilterParams({
      status: nextStatus === "active" ? "" : nextStatus,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={groupId}
          onChange={(event) => handleGroupChange(event.target.value)}
          aria-label="グループで絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全グループ</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.nameJa}
            </option>
          ))}
        </select>
        {isGroupFiltered && generationOptions.length > 0 && (
          <select
            value={generation}
            onChange={(event) => handleGenerationChange(event.target.value)}
            aria-label="期で絞り込み"
            className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">全期</option>
            {generationOptions.map((option) => (
              <option key={option} value={option}>
                {option}期生
              </option>
            ))}
          </select>
        )}
        <select
          value={status}
          onChange={(event) =>
            handleStatusChange(event.target.value as MemberStatus)
          }
          aria-label="在籍状況で絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="ml-auto shrink-0 text-sm text-foreground/50">
          {flatMembers.length}人
        </span>
      </div>
      {isGroupFiltered ? (
        <MemberGrid members={flatMembers} />
      ) : (
        <MemberSectionList sections={memberSections} />
      )}
    </div>
  );
}
