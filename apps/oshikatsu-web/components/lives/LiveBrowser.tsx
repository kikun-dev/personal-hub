"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
  // 件数(CollectionResultStatus)とそれに影響するfilter controlを
  // aria-controlsで関連付けるための安定id（#486 Decision 2 / PR #487 P2-2）
  const statusId = useId();
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
  // 既定filter（groupId=""）のままでも0件になりうるか。他Browser（Member/Song）
  // との対称性のため同じ形で持つが、Liveのfilterは出演グループ絞り込みのみで、
  // groupId===""のときfilterLivesByGroupは絞り込まずlives全体を返すため、
  // isEmptyFiltered===trueならgroupIdは必ず非既定（=hasActiveFilterは常にtrue）
  // になる。つまりLiveではこのgateは実質的にno-opだが、Member/Songと同じ判定
  // 方針を揃えるために置く（PR #487 P2-1）。
  const hasActiveFilter = groupId !== "";
  // Member/Songには「hasActiveFilter=trueでもreset後の既定条件で0件のまま」
  // というケースがあり、そのためcanRestoreByResetを別途持って
  // hasActiveFilter && canRestoreByResetでreset表示を絞る（PR #487レビュー
  // 追加指摘）。Liveは既定filter（groupId=""）自体がfilterLivesByGroupを
  // 素通りしてlives全体を返す＝isEmptySourceがfalseなら既定条件は必ず
  // 非0件になるため、canRestoreByResetは常にtrueで意味を持たない。
  // よってLiveだけcanRestoreByResetの変数やno-match時の専用文言分岐は作らない。

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
          aria-controls={statusId}
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
          id={statusId}
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
          {hasActiveFilter && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              className={standaloneTargetMinHeightClass}
            >
              絞り込みを解除
            </Button>
          )}
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
