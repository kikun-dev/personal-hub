"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ReleaseGrid } from "@/components/releases/ReleaseGrid";
import { ReleaseSectionList } from "@/components/releases/ReleaseSectionList";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import type { Group } from "@/types/group";
import {
  RELEASE_TYPES,
  RELEASE_TYPE_LABELS,
  isReleaseType,
  type ReleaseListItem,
  type ReleaseType,
} from "@/types/release";
import {
  filterReleasesByGroup,
  filterReleasesByType,
} from "@/usecases/releaseFilters";
import { createReleaseSections } from "@/usecases/groupListSections";

type ReleaseBrowserProps = {
  groups: Group[];
  releases: ReleaseListItem[];
};

function toReleaseType(value: string | null): ReleaseType | "" {
  return value && isReleaseType(value) ? value : "";
}

export function ReleaseBrowser({ groups, releases }: ReleaseBrowserProps) {
  // 絞り込みは URL を真実源にする（詳細→戻りでも URL から復元される）
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? "";
  const releaseType = toReleaseType(searchParams.get("releaseType"));

  const isGroupFiltered = groupId !== "";

  // リリースタイプで先に絞り込んだ母集合
  const baseReleases = useMemo(
    () => filterReleasesByType(releases, releaseType),
    [releases, releaseType]
  );

  // 件数表示・フラット表示用（グループも適用）
  const flatReleases = useMemo(
    () => filterReleasesByGroup(baseReleases, groupId),
    [baseReleases, groupId]
  );
  // セクション表示はグループ未選択時のみ使う
  const releaseSections = useMemo(
    () => (isGroupFiltered ? [] : createReleaseSections(baseReleases, groups)),
    [isGroupFiltered, baseReleases, groups]
  );

  const handleGroupChange = (nextGroupId: string) => {
    replaceListFilterParams({ groupId: nextGroupId });
  };

  const handleReleaseTypeChange = (nextReleaseType: ReleaseType | "") => {
    replaceListFilterParams({ releaseType: nextReleaseType });
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
          value={releaseType}
          onChange={(event) =>
            handleReleaseTypeChange(event.target.value as ReleaseType | "")
          }
          aria-label="リリースタイプで絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全タイプ</option>
          {RELEASE_TYPES.map((type) => (
            <option key={type} value={type}>
              {RELEASE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <span className="ml-auto shrink-0 text-sm text-foreground/50">
          {flatReleases.length}件
        </span>
      </div>
      {isGroupFiltered ? (
        <ReleaseGrid releases={flatReleases} />
      ) : (
        <ReleaseSectionList sections={releaseSections} />
      )}
    </div>
  );
}
