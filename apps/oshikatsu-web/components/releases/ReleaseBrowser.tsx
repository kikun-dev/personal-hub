"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReleaseGrid } from "@/components/releases/ReleaseGrid";
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

type ReleaseBrowserProps = {
  groups: Group[];
  releases: ReleaseListItem[];
};

function toReleaseType(value: string | null): ReleaseType | "" {
  return value && isReleaseType(value) ? value : "";
}

export function ReleaseBrowser({ groups, releases }: ReleaseBrowserProps) {
  // 即時反映は local state、戻る/リロード等の URL 変化は useEffect で同期する
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get("groupId") ?? "";
  const urlReleaseType = toReleaseType(searchParams.get("releaseType"));
  const [groupId, setGroupId] = useState(urlGroupId);
  const [releaseType, setReleaseType] = useState<ReleaseType | "">(
    urlReleaseType
  );

  useEffect(() => {
    setGroupId(urlGroupId);
  }, [urlGroupId]);
  useEffect(() => {
    setReleaseType(urlReleaseType);
  }, [urlReleaseType]);

  // グループ＋リリースタイプで絞り込み、リリース日の降順（未定は末尾）で表示
  const flatReleases = useMemo(() => {
    const filtered = filterReleasesByGroup(
      filterReleasesByType(releases, releaseType),
      groupId
    );
    return [...filtered].sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0;
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return b.releaseDate.localeCompare(a.releaseDate);
    });
  }, [releases, releaseType, groupId]);

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    replaceListFilterParams({ groupId: nextGroupId });
  };

  const handleReleaseTypeChange = (nextReleaseType: ReleaseType | "") => {
    setReleaseType(nextReleaseType);
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
      <ReleaseGrid releases={flatReleases} />
    </div>
  );
}
