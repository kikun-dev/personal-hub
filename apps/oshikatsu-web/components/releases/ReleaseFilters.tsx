"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Group } from "@/types/group";
import { RELEASE_TYPES, RELEASE_TYPE_LABELS } from "@/types/release";

type ReleaseFiltersProps = {
  groups: Group[];
};

export function ReleaseFilters({ groups }: ReleaseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentGroupId = searchParams.get("groupId") ?? "";
  const currentReleaseType = searchParams.get("releaseType") ?? "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/releases?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={currentGroupId}
        onChange={(e) => updateFilter("groupId", e.target.value)}
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
        value={currentReleaseType}
        onChange={(e) => updateFilter("releaseType", e.target.value)}
        className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
      >
        <option value="">全タイプ</option>
        {RELEASE_TYPES.map((releaseType) => (
          <option key={releaseType} value={releaseType}>
            {RELEASE_TYPE_LABELS[releaseType]}
          </option>
        ))}
      </select>
    </div>
  );
}
