"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LiveCard } from "@/components/lives/LiveCard";
import { Button } from "@/components/ui/Button";
import { CollectionResultStatus } from "@/components/ui/CollectionResultStatus";
import { focusRingClass, standaloneTargetMinHeightClass } from "@/components/ui/interactionStyles";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import type { Group } from "@/types/group";
import type { LiveListItem } from "@/types/live";
import { filterLivesByGroup } from "@/usecases/liveFilters";

type LiveBrowserProps = {
  groups: Group[];
  lives: LiveListItem[];
};

export function LiveBrowser({ groups, lives }: LiveBrowserProps) {
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get("groupId") ?? "";
  const [groupId, setGroupId] = useState(urlGroupId);

  useEffect(() => {
    setGroupId(urlGroupId);
  }, [urlGroupId]);

  // 出演グループで絞り込み、最初の公演日の降順（未定は末尾）で表示
  const filteredLives = useMemo(() => {
    const filtered = filterLivesByGroup(lives, groupId);
    return [...filtered].sort((a, b) => {
      if (!a.firstDate && !b.firstDate) return 0;
      if (!a.firstDate) return 1;
      if (!b.firstDate) return -1;
      return b.firstDate.localeCompare(a.firstDate);
    });
  }, [lives, groupId]);

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    replaceListFilterParams({ groupId: nextGroupId });
  };

  // 元データ自体が0件（filterの結果ではない）
  const isEmptySource = lives.length === 0;
  // 元データはあるがfilterの結果0件になっている
  const isEmptyFiltered = !isEmptySource && filteredLives.length === 0;

  const handleReset = () => {
    setGroupId("");
    replaceListFilterParams({ groupId: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={groupId}
          onChange={(event) => handleGroupChange(event.target.value)}
          aria-label="出演グループで絞り込み"
          className={`rounded-lg border border-border-strong bg-background px-3 py-1.5 text-sm text-foreground ${standaloneTargetMinHeightClass} ${focusRingClass}`}
        >
          <option value="">全グループ</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.nameJa}
            </option>
          ))}
        </select>
        <CollectionResultStatus
          className="ml-auto shrink-0 text-sm text-foreground-secondary"
          data-ui="live-count"
          count={filteredLives.length}
          unit="件"
        />
      </div>

      {isEmptySource ? (
        <p
          className="py-12 text-center text-sm text-foreground-secondary"
          data-ui="live-empty"
        >
          まだライブが登録されていません
        </p>
      ) : isEmptyFiltered ? (
        <div
          className="space-y-3 py-12 text-center text-sm text-foreground-secondary"
          data-ui="live-empty"
        >
          <p>条件に一致するライブが見つかりません</p>
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            className={standaloneTargetMinHeightClass}
          >
            絞り込みを解除
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLives.map((live) => (
            <LiveCard key={live.id} live={live} />
          ))}
        </div>
      )}
    </div>
  );
}
