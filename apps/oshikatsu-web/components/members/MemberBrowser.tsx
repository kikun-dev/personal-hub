"use client";

import { useMemo, useState } from "react";
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
  initialGeneration: string;
  initialGroupId: string;
  initialStatus: MemberStatus;
  members: MemberListItem[];
};

const STATUS_OPTIONS: { label: string; value: MemberStatus }[] = [
  { label: "全員", value: "all" },
  { label: "現役", value: "active" },
  { label: "卒業", value: "graduated" },
];

export function MemberBrowser({
  groups,
  initialGeneration,
  initialGroupId,
  initialStatus,
  members,
}: MemberBrowserProps) {
  const [groupId, setGroupId] = useState(initialGroupId);
  const [status, setStatus] = useState<MemberStatus>(initialStatus);

  const isGroupFiltered = groupId !== "";

  // ステータス・期生で先に絞り込んだ母集合
  const baseMembers = useMemo(
    () =>
      filterMembersByGeneration(
        filterMembersByStatus(members, status),
        initialGeneration
      ),
    [members, status, initialGeneration]
  );

  // 件数表示・フラット表示用（グループも適用）
  const flatMembers = useMemo(
    () => filterMembersByGroup(baseMembers, groupId),
    [baseMembers, groupId]
  );
  // セクション表示はグループ未選択時のみ使う
  const memberSections = useMemo(
    () => (isGroupFiltered ? [] : createMemberSections(baseMembers, groups)),
    [isGroupFiltered, baseMembers, groups]
  );

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    replaceListFilterParams({ groupId: nextGroupId });
  };

  const handleStatusChange = (nextStatus: MemberStatus) => {
    setStatus(nextStatus);
    // 既定（現役）に戻す場合は URL から status を外す
    replaceListFilterParams({ status: nextStatus === "active" ? "" : nextStatus });
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
