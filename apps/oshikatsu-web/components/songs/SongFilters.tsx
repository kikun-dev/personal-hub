"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Group } from "@/types/group";

type SongFiltersProps = {
  groups: Group[];
};

export function SongFilters({ groups }: SongFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentGroupId = searchParams.get("groupId") ?? "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/songs?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={currentGroupId}
        onChange={(e) => updateFilter("groupId", e.target.value)}
        className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
      >
        <option value="">全グループ</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nameJa}
          </option>
        ))}
      </select>
    </div>
  );
}
