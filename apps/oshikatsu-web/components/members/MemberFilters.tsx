"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Group } from "@/types/group";

type MemberFiltersProps = {
  groups: Group[];
};

export function MemberFilters({ groups }: MemberFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentGroupId = searchParams.get("groupId") ?? "";
  const currentStatus = searchParams.get("status") ?? "all";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/members?${params.toString()}`);
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

      <select
        value={currentStatus}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
      >
        <option value="all">全員</option>
        <option value="active">現役</option>
        <option value="graduated">卒業</option>
      </select>
    </div>
  );
}
